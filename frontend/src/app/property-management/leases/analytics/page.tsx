'use client';

import Layout from '../../../../components/Layout';
import LeaseAnalyticsDashboard from '../../../../components/LeaseAnalyticsDashboard';

const LeaseAnalyticsPage = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <LeaseAnalyticsDashboard />
        </div>
      </div>
    </Layout>
  );
};

export default LeaseAnalyticsPage; 