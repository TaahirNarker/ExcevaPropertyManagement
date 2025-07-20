'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  StarIcon,
  CogIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

interface InspectionTemplate {
  id: string;
  name: string;
  type: 'move_in' | 'periodic' | 'move_out' | 'custom';
  is_standard: boolean;
  description: string;
  estimated_duration: number;
  categories: InspectionCategory[];
  created_at: string;
  updated_at: string;
  usage_count: number;
}

interface InspectionCategory {
  id: string;
  name: string;
  description?: string;
  items: InspectionItem[];
}

interface InspectionItem {
  id: string;
  name: string;
  description?: string;
  is_required: boolean;
  condition_options: string[];
  notes?: string;
}

export default function InspectionTemplatesPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<InspectionTemplate | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  // Mock data
  const mockTemplates: InspectionTemplate[] = [
    {
      id: 'template1',
      name: 'Standard Move-In Inspection',
      type: 'move_in',
      is_standard: true,
      description: 'Comprehensive move-in inspection covering all areas of the unit including appliances, fixtures, and overall condition.',
      estimated_duration: 60,
      usage_count: 45,
      categories: [
        {
          id: 'cat1',
          name: 'Kitchen',
          description: 'Kitchen appliances, fixtures, and surfaces',
          items: [
            {
              id: 'item1',
              name: 'Refrigerator',
              description: 'Check refrigerator condition, cleanliness, and functionality',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Not Working'],
              notes: 'Test temperature settings and ice maker if applicable'
            },
            {
              id: 'item2',
              name: 'Stove/Oven',
              description: 'Inspect stove burners, oven functionality, and cleanliness',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Not Working']
            },
            {
              id: 'item3',
              name: 'Cabinets & Drawers',
              description: 'Check cabinet doors, drawers, and hardware',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged']
            },
            {
              id: 'item4',
              name: 'Countertops',
              description: 'Inspect countertop condition and cleanliness',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged']
            },
            {
              id: 'item5',
              name: 'Sink & Faucet',
              description: 'Check sink condition and faucet functionality',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Leaking']
            }
          ]
        },
        {
          id: 'cat2',
          name: 'Bathroom',
          description: 'Bathroom fixtures, plumbing, and surfaces',
          items: [
            {
              id: 'item6',
              name: 'Toilet',
              description: 'Check toilet functionality and condition',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Not Working']
            },
            {
              id: 'item7',
              name: 'Shower/Tub',
              description: 'Inspect shower/tub condition and water pressure',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Leaking']
            },
            {
              id: 'item8',
              name: 'Vanity & Mirror',
              description: 'Check vanity condition and mirror mounting',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged']
            }
          ]
        },
        {
          id: 'cat3',
          name: 'Living Areas',
          description: 'Living room, bedrooms, and common areas',
          items: [
            {
              id: 'item9',
              name: 'Flooring',
              description: 'Inspect all flooring types (carpet, hardwood, tile)',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged']
            },
            {
              id: 'item10',
              name: 'Walls & Paint',
              description: 'Check wall condition and paint quality',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repainting']
            },
            {
              id: 'item11',
              name: 'Windows & Blinds',
              description: 'Inspect windows, locks, and window treatments',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged']
            }
          ]
        },
        {
          id: 'cat4',
          name: 'Safety & Systems',
          description: 'Safety equipment and building systems',
          items: [
            {
              id: 'item12',
              name: 'Smoke Detectors',
              description: 'Test all smoke detectors and check battery levels',
              is_required: true,
              condition_options: ['Working', 'Needs Battery', 'Not Working']
            },
            {
              id: 'item13',
              name: 'HVAC System',
              description: 'Check heating/cooling system functionality',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Not Working']
            }
          ]
        }
      ],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'template2',
      name: 'Quarterly Inspection',
      type: 'periodic',
      is_standard: true,
      description: 'Regular quarterly inspection focusing on maintenance issues and safety compliance.',
      estimated_duration: 45,
      usage_count: 32,
      categories: [
        {
          id: 'cat5',
          name: 'Safety Check',
          items: [
            {
              id: 'item14',
              name: 'Smoke Detectors',
              description: 'Test all smoke detectors and replace batteries if needed',
              is_required: true,
              condition_options: ['Working', 'Needs Battery', 'Not Working']
            },
            {
              id: 'item15',
              name: 'Carbon Monoxide Detectors',
              description: 'Test CO detectors if applicable',
              is_required: false,
              condition_options: ['Working', 'Needs Battery', 'Not Working']
            }
          ]
        },
        {
          id: 'cat6',
          name: 'Maintenance Issues',
          items: [
            {
              id: 'item16',
              name: 'Plumbing',
              description: 'Check for leaks, water pressure, and drainage',
              is_required: true,
              condition_options: ['No Issues', 'Minor Issues', 'Major Issues']
            },
            {
              id: 'item17',
              name: 'Electrical',
              description: 'Test outlets, switches, and lighting',
              is_required: true,
              condition_options: ['No Issues', 'Minor Issues', 'Major Issues']
            }
          ]
        }
      ],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'template3',
      name: 'Standard Move-Out Inspection',
      type: 'move_out',
      is_standard: true,
      description: 'Comprehensive move-out inspection for damage assessment and security deposit evaluation.',
      estimated_duration: 75,
      usage_count: 28,
      categories: [
        {
          id: 'cat7',
          name: 'Damage Assessment',
          items: [
            {
              id: 'item18',
              name: 'Walls & Paint',
              description: 'Assess wall damage and paint condition',
              is_required: true,
              condition_options: ['No Damage', 'Minor Scuffs', 'Holes', 'Needs Repainting', 'Major Damage']
            },
            {
              id: 'item19',
              name: 'Flooring Damage',
              description: 'Document any damage to flooring',
              is_required: true,
              condition_options: ['No Damage', 'Minor Wear', 'Stains', 'Scratches', 'Major Damage']
            }
          ]
        },
        {
          id: 'cat8',
          name: 'Cleanliness',
          items: [
            {
              id: 'item20',
              name: 'Overall Cleanliness',
              description: 'Assess overall unit cleanliness',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Unacceptable']
            }
          ]
        }
      ],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'template4',
      name: 'Custom Luxury Unit Inspection',
      type: 'custom',
      is_standard: false,
      description: 'Specialized inspection template for luxury units with high-end finishes and amenities.',
      estimated_duration: 120,
      usage_count: 8,
      categories: [
        {
          id: 'cat9',
          name: 'Premium Finishes',
          items: [
            {
              id: 'item21',
              name: 'Marble Countertops',
              description: 'Inspect marble surfaces for chips, stains, or damage',
              is_required: true,
              condition_options: ['Perfect', 'Minor Imperfections', 'Noticeable Damage', 'Needs Repair']
            },
            {
              id: 'item22',
              name: 'Hardwood Floors',
              description: 'Check premium hardwood flooring condition',
              is_required: true,
              condition_options: ['Perfect', 'Minor Scratches', 'Noticeable Wear', 'Needs Refinishing']
            }
          ]
        }
      ],
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z'
    }
  ];

  // Initialize data
  useEffect(() => {
    if (isAuthenticated) {
      setTemplates(mockTemplates);
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (filterType === 'all') return true;
    if (filterType === 'standard') return template.is_standard;
    if (filterType === 'custom') return !template.is_standard;
    return template.type === filterType;
  });

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalItems = (template: InspectionTemplate) => {
    return template.categories.reduce((total, category) => total + category.items.length, 0);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'move_in': return 'bg-green-100 text-green-800 border-green-200';
      case 'periodic': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'move_out': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'custom': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-muted text-muted-foreground border-gray-200';
    }
  };

  // Navigation handlers
  const handleCreateTemplate = () => {
    setShowCreateModal(true);
  };

  const handleViewTemplate = (template: InspectionTemplate) => {
    setSelectedTemplate(template);
    setShowDetailModal(true);
  };

  const handleEditTemplate = (template: InspectionTemplate) => {
    router.push(`/dashboard/inspections/templates/edit/${template.id}`);
  };

  const handleDuplicateTemplate = async (template: InspectionTemplate) => {
    try {
      // TODO: Implement duplicate API call
      const duplicatedTemplate = {
        ...template,
        id: `${template.id}_copy`,
        name: `${template.name} (Copy)`,
        is_standard: false,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setTemplates(prev => [...prev, duplicatedTemplate]);
      toast.success('Template duplicated successfully');
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleDeleteTemplate = async (template: InspectionTemplate) => {
    if (template.is_standard) {
      toast.error('Cannot delete standard templates');
      return;
    }

    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }
    
    try {
      // TODO: Implement delete API call
      setTemplates(prev => prev.filter(t => t.id !== template.id));
      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Inspection Templates">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Inspection Templates">
      <div className="p-6">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 backdrop-blur-sm hover:bg-white/20"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Inspections
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Left side - Create button */}
              <button
                onClick={handleCreateTemplate}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Template
              </button>

              {/* Right side - Filter */}
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-muted-foreground">Filter by:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Templates</option>
                  <option value="standard">Standard Templates</option>
                  <option value="custom">Custom Templates</option>
                  <option value="move_in">Move-In Templates</option>
                  <option value="periodic">Periodic Templates</option>
                  <option value="move_out">Move-Out Templates</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 hover:bg-white/15 transition-colors">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-8 w-8 text-blue-400" />
                  </div>
                  {template.is_standard && (
                    <StarIcon className="h-5 w-5 text-yellow-400 fill-current" />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleViewTemplate(template)}
                    className="text-blue-400 hover:text-blue-300 p-1 rounded"
                    title="View Details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="text-yellow-400 hover:text-yellow-300 p-1 rounded"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicateTemplate(template)}
                    className="text-green-400 hover:text-green-300 p-1 rounded"
                    title="Duplicate"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>
                  {!template.is_standard && (
                    <button
                      onClick={() => handleDeleteTemplate(template)}
                      className="text-red-400 hover:text-red-300 p-1 rounded"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-medium text-white">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(template.type)}`}>
                    {template.type.replace('_', '-').charAt(0).toUpperCase() + template.type.replace('_', '-').slice(1)}
                  </span>
                  {template.is_standard && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                      Standard
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground/70">Items:</span>
                    <span className="text-white ml-2">{getTotalItems(template)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70">Duration:</span>
                    <span className="text-white ml-2">~{template.estimated_duration}min</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70">Categories:</span>
                    <span className="text-white ml-2">{template.categories.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70">Used:</span>
                    <span className="text-white ml-2">{template.usage_count} times</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground/70">
                  Created: {formatDate(template.created_at)}
                  {template.updated_at !== template.created_at && (
                    <span className="ml-2">• Updated: {formatDate(template.updated_at)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-20">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              {filterType === 'all' 
                ? "Get started by creating your first inspection template."
                : `No templates found for the selected filter: ${filterType}.`
              }
            </p>
            <button
              onClick={handleCreateTemplate}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Template
            </button>
          </div>
        )}

        {/* Template Detail Modal */}
        {showDetailModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <div>
                  <h3 className="text-xl font-medium text-white">{selectedTemplate.name}</h3>
                  <p className="text-muted-foreground mt-1">{selectedTemplate.description}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-muted-foreground/70 hover:text-white p-2 rounded-lg hover:bg-white/10"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {/* Template Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground/70">Type</div>
                    <div className="text-white font-medium capitalize">{selectedTemplate.type.replace('_', '-')}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground/70">Duration</div>
                    <div className="text-white font-medium">~{selectedTemplate.estimated_duration} min</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground/70">Total Items</div>
                    <div className="text-white font-medium">{getTotalItems(selectedTemplate)}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground/70">Usage Count</div>
                    <div className="text-white font-medium">{selectedTemplate.usage_count}</div>
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-white">Categories & Items</h4>
                  {selectedTemplate.categories.map((category, categoryIndex) => (
                    <div key={category.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-md font-medium text-white">{category.name}</h5>
                        <span className="text-sm text-muted-foreground/70">{category.items.length} items</span>
                      </div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                      )}
                      <div className="space-y-2">
                        {category.items.map((item, itemIndex) => (
                          <div key={item.id} className="bg-white/5 rounded p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-white">{item.name}</span>
                                  {item.is_required && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Required
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                )}
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {item.condition_options.map((option, optionIndex) => (
                                    <span key={optionIndex} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                      {option}
                                    </span>
                                  ))}
                                </div>
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground/70 mt-1 italic">{item.notes}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-white/20">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEditTemplate(selectedTemplate);
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Edit Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 