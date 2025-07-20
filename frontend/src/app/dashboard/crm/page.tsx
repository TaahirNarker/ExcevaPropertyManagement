/**
 * CRM Dashboard Page
 * Comprehensive Customer Relationship Management interface
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserPlusIcon, 
  UserGroupIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BellIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/DashboardLayout';
import LeadForm from '@/components/LeadForm';

// Types
interface Lead {
  id?: string;
  name: string;
  email: string;
  phone: string;
  source: 'Property24' | 'PrivateProperty' | 'Facebook' | 'Walk-in' | 'Referral';
  stage: 'New' | 'Contacted' | 'Qualified' | 'Viewing Scheduled' | 'Application Sent' | 'Converted' | 'Dropped';
  assignedTo: string;
  propertyInterest?: string;
  notes: string;
  createdAt?: string;
  lastContact?: string;
  nextFollowUp?: string;
}

interface Contact {
  id: string;
  name: string;
  type: 'Prospective Tenant' | 'Current Tenant' | 'Landlord' | 'Service Provider';
  email: string;
  phone: string;
  address: string;
  emergencyContact: string;
  documents: string[];
  linkedProperties: string[];
  createdAt: string;
}

interface Communication {
  id: string;
  contactId: string;
  type: 'Call' | 'Email' | 'SMS';
  direction: 'Inbound' | 'Outbound';
  subject?: string;
  content: string;
  timestamp: string;
  duration?: number; // for calls
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed';
  relatedContact?: string;
  relatedProperty?: string;
  createdAt: string;
}

// Mock data - moved outside component to avoid recreation
const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+27 82 123 4567',
    source: 'Property24',
    stage: 'Qualified',
    assignedTo: 'Sarah Johnson',
    propertyInterest: 'Sunset Villas Unit 101',
    notes: 'Interested in 2-bedroom apartment. Budget R15,000/month.',
    createdAt: '2024-01-15',
    lastContact: '2024-01-20',
    nextFollowUp: '2024-01-25'
  },
  {
    id: '2',
    name: 'Maria Garcia',
    email: 'maria.garcia@email.com',
    phone: '+27 83 987 6543',
    source: 'Facebook',
    stage: 'Viewing Scheduled',
    assignedTo: 'Mike Wilson',
    propertyInterest: 'Ocean View Complex Unit 205',
    notes: 'Scheduled viewing for Saturday 2pm. Prefers ground floor.',
    createdAt: '2024-01-18',
    lastContact: '2024-01-22'
  }
];

const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'John Smith',
    type: 'Prospective Tenant',
    email: 'john.smith@email.com',
    phone: '+27 82 123 4567',
    address: '123 Main St, Cape Town',
    emergencyContact: '+27 82 123 4568',
    documents: ['ID Document', 'Proof of Income'],
    linkedProperties: ['Sunset Villas Unit 101'],
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'David Mokoena',
    type: 'Current Tenant',
    email: 'david.mokoena@email.com',
    phone: '+27 84 555 1234',
    address: '456 Oak Ave, Johannesburg',
    emergencyContact: '+27 84 555 1235',
    documents: ['Lease Agreement', 'ID Document'],
    linkedProperties: ['Parkview Apartments Unit 302'],
    createdAt: '2023-06-10'
  }
];

const mockCommunications: Communication[] = [
  {
    id: '1',
    contactId: '1',
    type: 'Call',
    direction: 'Outbound',
    content: 'Follow-up call about viewing appointment',
    timestamp: '2024-01-20T10:30:00',
    duration: 5
  },
  {
    id: '2',
    contactId: '1',
    type: 'Email',
    direction: 'Outbound',
    subject: 'Property Viewing Confirmation',
    content: 'Hi John, confirming your viewing appointment...',
    timestamp: '2024-01-19T14:15:00'
  }
];

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Follow up with Mr. Mokoena on viewing',
    description: 'Call to confirm viewing appointment for Saturday',
    assignedTo: 'Sarah Johnson',
    dueDate: '2024-01-25',
    priority: 'High',
    status: 'Pending',
    relatedContact: 'John Smith',
    relatedProperty: 'Sunset Villas Unit 101',
    createdAt: '2024-01-20'
  },
  {
    id: '2',
    title: 'Send lease agreement to Maria Garcia',
    description: 'Prepare and send lease agreement after successful viewing',
    assignedTo: 'Mike Wilson',
    dueDate: '2024-01-28',
    priority: 'Medium',
    status: 'In Progress',
    relatedContact: 'Maria Garcia',
    relatedProperty: 'Ocean View Complex Unit 205',
    createdAt: '2024-01-22'
  }
];

export default function CRMDashboardPage() {
  // State
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Lead form state
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadFormMode, setLeadFormMode] = useState<'add' | 'edit'>('add');

  // Load data only when needed
  useEffect(() => {
    if (!dataLoaded) {
      setLoading(true);
      // Remove artificial delay - load data immediately
      setLeads(mockLeads);
      setContacts(mockContacts);
      setCommunications(mockCommunications);
      setTasks(mockTasks);
      setDataLoaded(true);
      setLoading(false);
    }
  }, [dataLoaded]);

  // Tab configuration
  const tabs = [
    { id: 'leads', name: 'Leads', icon: UserPlusIcon },
    { id: 'contacts', name: 'Contacts', icon: UserGroupIcon },
    { id: 'communications', name: 'Communications', icon: PhoneIcon },
    { id: 'tasks', name: 'Tasks', icon: CalendarIcon },
    { id: 'properties', name: 'Properties', icon: BuildingOfficeIcon },
    { id: 'reports', name: 'Reports', icon: ChartBarIcon }
  ];

  // Helper functions
  const getStageColor = (stage: Lead['stage']) => {
    const colors = {
      'New': 'bg-muted text-muted-foreground',
      'Contacted': 'bg-blue-100 text-blue-800',
      'Qualified': 'bg-yellow-100 text-yellow-800',
      'Viewing Scheduled': 'bg-purple-100 text-purple-800',
      'Application Sent': 'bg-indigo-100 text-indigo-800',
      'Converted': 'bg-green-100 text-green-800',
      'Dropped': 'bg-red-100 text-red-800'
    };
    return colors[stage];
  };

  const handleAddLead = () => {
    setEditingLead(null);
    setLeadFormMode('add');
    setIsLeadFormOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadFormMode('edit');
    setIsLeadFormOpen(true);
  };

  const handleSaveLead = (lead: Lead) => {
    if (leadFormMode === 'add') {
      setLeads(prev => [...prev, { ...lead, id: Date.now().toString() }]);
    } else {
      setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
    }
    setIsLeadFormOpen(false);
    setEditingLead(null);
  };

  const handleCloseLeadForm = () => {
    setIsLeadFormOpen(false);
    setEditingLead(null);
  };

  const getPriorityColor = (priority: Task['priority']) => {
    const colors = {
      'Low': 'bg-green-100 text-green-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'High': 'bg-red-100 text-red-800'
    };
    return colors[priority];
  };

  const getStatusColor = (status: Task['status']) => {
    const colors = {
      'Pending': 'bg-muted text-muted-foreground',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800'
    };
    return colors[status];
  };

  // Only show loading for initial data load
  if (loading && !dataLoaded) {
    return (
      <DashboardLayout title="CRM">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="CRM">
      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-600 rounded-lg">
                <UserPlusIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold text-foreground">{leads.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-600 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Contacts</p>
                <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-600 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending Tasks</p>
                <p className="text-2xl font-bold text-foreground">{tasks.filter(t => t.status === 'Pending').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-600 rounded-lg">
                <PhoneIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Communications</p>
                <p className="text-2xl font-bold text-foreground">{communications.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border mb-6">
          <div className="border-b border-border">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'leads' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-foreground">Leads & Prospects</h3>
                  <button 
                    onClick={handleAddLead}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Lead
                  </button>
                </div>

                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Lead</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-background divide-y divide-border">
                      {leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-muted/30">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-foreground">{lead.name}</div>
                              <div className="text-sm text-muted-foreground">{lead.email}</div>
                              <div className="text-sm text-muted-foreground">{lead.phone}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{lead.source}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(lead.stage)}`}>
                              {lead.stage}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{lead.assignedTo}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{lead.lastContact ? new Date(lead.lastContact).toLocaleDateString() : 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-400 hover:text-blue-300 mr-3">View</button>
                            <button 
                              onClick={() => handleEditLead(lead)}
                              className="text-indigo-400 hover:text-indigo-300 mr-3"
                            >
                              Edit
                            </button>
                            <button className="text-green-400 hover:text-green-300">Convert</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'contacts' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-foreground">Contact Database</h3>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Contact
                  </button>
                </div>

                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Info</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Linked Properties</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Documents</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-background divide-y divide-border">
                      {contacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-muted/30">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-foreground">{contact.name}</div>
                              <div className="text-sm text-muted-foreground">{contact.address}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {contact.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-muted-foreground">{contact.email}</div>
                            <div className="text-sm text-muted-foreground">{contact.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {contact.linkedProperties.join(', ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {contact.documents.length} documents
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-400 hover:text-blue-300 mr-3">View</button>
                            <button className="text-indigo-400 hover:text-indigo-300 mr-3">Edit</button>
                            <button className="text-green-400 hover:text-green-300">Message</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'communications' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-foreground">Communication History</h3>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    New Communication
                  </button>
                </div>

                <div className="space-y-4">
                  {communications.map((comm) => (
                    <div key={comm.id} className="bg-card/50 rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            comm.type === 'Call' ? 'bg-green-100' : 
                            comm.type === 'Email' ? 'bg-blue-100' : 'bg-purple-100'
                          }`}>
                            {comm.type === 'Call' && <PhoneIcon className="h-4 w-4 text-green-600" />}
                            {comm.type === 'Email' && <EnvelopeIcon className="h-4 w-4 text-blue-600" />}
                            {comm.type === 'SMS' && <DocumentTextIcon className="h-4 w-4 text-purple-600" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-foreground">{comm.type}</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                comm.direction === 'Inbound' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {comm.direction}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{comm.content}</p>
                            {comm.subject && <p className="text-xs text-muted-foreground">Subject: {comm.subject}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{new Date(comm.timestamp).toLocaleString()}</p>
                          {comm.duration && <p className="text-xs text-muted-foreground">{comm.duration} min</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-foreground">Task Management</h3>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    New Task
                  </button>
                </div>

                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-card/50 rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Assigned to: {task.assignedTo}</span>
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                            {task.relatedContact && <span>Contact: {task.relatedContact}</span>}
                            {task.relatedProperty && <span>Property: {task.relatedProperty}</span>}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-blue-400 hover:text-blue-300">Edit</button>
                          <button className="text-green-400 hover:text-green-300">Complete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'properties' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-foreground">Property CRM</h3>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Link Property
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-card/50 rounded-lg border border-border p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <BuildingOfficeIcon className="h-6 w-6 text-blue-400" />
                      <h4 className="text-sm font-medium text-foreground">Sunset Villas Unit 101</h4>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Status: Available</p>
                      <p>Interested Leads: 3</p>
                      <p>Viewings Scheduled: 2</p>
                      <p>Applications: 1</p>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button className="text-blue-400 hover:text-blue-300 text-sm">View Details</button>
                      <button className="text-green-400 hover:text-green-300 text-sm">Manage Leads</button>
                    </div>
                  </div>

                  <div className="bg-card/50 rounded-lg border border-border p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <BuildingOfficeIcon className="h-6 w-6 text-green-400" />
                      <h4 className="text-sm font-medium text-foreground">Ocean View Complex Unit 205</h4>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Status: Under Application</p>
                      <p>Interested Leads: 1</p>
                      <p>Viewings Scheduled: 1</p>
                      <p>Applications: 1</p>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button className="text-blue-400 hover:text-blue-300 text-sm">View Details</button>
                      <button className="text-green-400 hover:text-green-300 text-sm">Manage Leads</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-foreground">CRM Reports</h3>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    Export Report
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card/50 rounded-lg border border-border p-6">
                    <h4 className="text-lg font-medium text-foreground mb-4">Lead Conversion</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">New Leads</span>
                        <span className="text-sm font-medium text-foreground">12</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Qualified</span>
                        <span className="text-sm font-medium text-foreground">8</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Converted</span>
                        <span className="text-sm font-medium text-foreground">3</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Conversion Rate</span>
                        <span className="text-sm font-medium text-foreground">25%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card/50 rounded-lg border border-border p-6">
                    <h4 className="text-lg font-medium text-foreground mb-4">Communication Activity</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Calls</span>
                        <span className="text-sm font-medium text-foreground">45</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Emails</span>
                        <span className="text-sm font-medium text-foreground">23</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total SMS</span>
                        <span className="text-sm font-medium text-foreground">12</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Response Rate</span>
                        <span className="text-sm font-medium text-foreground">78%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lead Form Modal */}
      {isLeadFormOpen && (
        <LeadForm
          isOpen={isLeadFormOpen}
          onClose={handleCloseLeadForm}
          onSave={handleSaveLead}
          lead={editingLead}
          mode={leadFormMode}
        />
      )}
    </DashboardLayout>
  );
} 