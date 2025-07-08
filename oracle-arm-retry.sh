#!/bin/bash

# Oracle Cloud ARM Instance Auto-Retry Script
# This script attempts to create an ARM instance across different availability domains

echo "🚀 Starting Oracle Cloud ARM Instance Creation Attempts..."
echo "Press Ctrl+C to stop"

# Configuration
SHAPE="VM.Standard.A1.Flex"
OCPUS=4
MEMORY=24
IMAGE_ID="your-ubuntu-image-id"  # Replace with actual Ubuntu 22.04 image ID
SUBNET_ID="your-subnet-id"       # Replace with your subnet ID
DISPLAY_NAME="exceva-property-mgmt"

# Array of availability domains to try
ADS=("AD-1" "AD-2" "AD-3")

# Function to attempt instance creation
create_instance() {
    local ad=$1
    echo "🔄 Attempting to create instance in $ad..."
    
    # Replace this with your actual OCI CLI command
    oci compute instance launch \
        --availability-domain "$ad" \
        --compartment-id "$COMPARTMENT_ID" \
        --shape "$SHAPE" \
        --shape-config '{"ocpus": '$OCPUS', "memory": '$MEMORY'}' \
        --image-id "$IMAGE_ID" \
        --subnet-id "$SUBNET_ID" \
        --display-name "$DISPLAY_NAME-$ad" \
        --assign-public-ip true \
        --ssh-authorized-keys-file "$HOME/.ssh/id_rsa.pub" \
        --wait-for-state RUNNING \
        --max-wait-seconds 300
    
    return $?
}

# Main retry loop
attempt=1
max_attempts=50

while [ $attempt -le $max_attempts ]; do
    echo "🔄 Attempt $attempt of $max_attempts"
    
    # Try each availability domain
    for ad in "${ADS[@]}"; do
        echo "Trying $ad..."
        
        if create_instance "$ad"; then
            echo "✅ SUCCESS! Instance created in $ad"
            echo "🎉 Your ARM instance is now running!"
            exit 0
        else
            echo "❌ Failed to create instance in $ad"
        fi
        
        # Wait a bit between AD attempts
        sleep 5
    done
    
    echo "⏳ All ADs failed. Waiting 2 minutes before retry..."
    sleep 120
    
    ((attempt++))
done

echo "❌ Failed to create instance after $max_attempts attempts"
echo "💡 Try again during off-peak hours or consider a different region" 