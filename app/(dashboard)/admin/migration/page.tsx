'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Play, AlertCircle } from 'lucide-react';
import { TrashIcon } from '@/components/icons/TrashIcon';

interface MigrationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'error';
  logs: string[];
  count?: number;
  error?: string;
}

const initialSteps: MigrationStep[] = [
  { id: 'organisations', name: 'Organisations', description: 'Migrate referrer organisations', status: 'pending', logs: [] },
  { id: 'users', name: 'Users', description: 'Migrate users to Supabase Auth', status: 'pending', logs: [] },
  { id: 'directors', name: 'Directors', description: 'Migrate organisation directors', status: 'pending', logs: [] },
  { id: 'clients', name: 'Clients', description: 'Migrate client records', status: 'pending', logs: [] },
  { id: 'opportunities', name: 'Opportunities', description: 'Migrate applications to opportunities', status: 'pending', logs: [] },
  { id: 'opportunity_details', name: 'Opportunity Details', description: 'Migrate extended opportunity data', status: 'pending', logs: [] },
  { id: 'comments', name: 'Comments', description: 'Migrate application comments', status: 'pending', logs: [] },
  { id: 'pre_assessment', name: 'Pre-Assessment Contacts', description: 'Migrate pre-assessment submissions', status: 'pending', logs: [] },
  { id: 'global_settings', name: 'Global Settings', description: 'Migrate app configuration', status: 'pending', logs: [] },
];

export default function MigrationPage() {
  const [steps, setSteps] = useState<MigrationStep[]>(initialSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [clearStatus, setClearStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [clearLogs, setClearLogs] = useState<string[]>([]);
  const [clearError, setClearError] = useState<string | null>(null);

  const updateStep = (id: string, updates: Partial<MigrationStep>) => {
    setSteps(prev => prev.map(step =>
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const runStep = async (stepId: string) => {
    updateStep(stepId, { status: 'running', logs: [], error: undefined });
    setCurrentStep(stepId);

    try {
      const response = await fetch('/api/admin/migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepId }),
      });

      const data = await response.json();

      if (data.success) {
        updateStep(stepId, {
          status: 'success',
          logs: data.logs || [],
          count: data.count,
        });
        return true;
      } else {
        updateStep(stepId, {
          status: 'error',
          logs: data.logs || [],
          error: data.error,
        });
        return false;
      }
    } catch (error: any) {
      updateStep(stepId, {
        status: 'error',
        error: error.message,
      });
      return false;
    }
  };

  const runAllMigrations = async () => {
    setIsRunning(true);

    for (const step of steps) {
      const success = await runStep(step.id);
      if (!success) {
        // Continue with next step even if current fails
        console.log(`Step ${step.id} failed, continuing...`);
      }
    }

    setIsRunning(false);
    setCurrentStep(null);
  };

  const runSingleStep = async (stepId: string) => {
    setIsRunning(true);
    await runStep(stepId);
    setIsRunning(false);
    setCurrentStep(null);
  };

  const resetAll = () => {
    setSteps(initialSteps);
    setCurrentStep(null);
    setClearStatus('idle');
    setClearLogs([]);
    setClearError(null);
  };

  const clearAllData = async () => {
    if (!confirm('WARNING: This will delete ALL migrated data (except super admin accounts). Are you sure?')) {
      return;
    }

    setClearStatus('running');
    setClearLogs([]);
    setClearError(null);
    setIsRunning(true);

    try {
      const response = await fetch('/api/admin/migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'clear_all' }),
      });

      const data = await response.json();

      if (data.success) {
        setClearStatus('success');
        setClearLogs(data.logs || []);
        // Reset all step statuses
        setSteps(initialSteps);
      } else {
        setClearStatus('error');
        setClearLogs(data.logs || []);
        setClearError(data.error);
      }
    } catch (error: any) {
      setClearStatus('error');
      setClearError(error.message);
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: MigrationStep['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />;
      case 'running':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
    }
  };

  const completedCount = steps.filter(s => s.status === 'success').length;
  const errorCount = steps.filter(s => s.status === 'error').length;

  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Migration</h1>
        <p className="text-gray-600">
          Migrate data from the old CakePHP system to Supabase
        </p>
      </div>

      {/* Clear Data Section */}
      <Card className="mb-6 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Step 1: Clear Existing Data</CardTitle>
          <CardDescription className="text-red-700">
            Delete all migrated data before re-importing. Super admin accounts are preserved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap items-center">
            <Button
              onClick={clearAllData}
              disabled={isRunning}
              variant="destructive"
              size="lg"
            >
              {clearStatus === 'running' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <TrashIcon className="mr-2" size={16} />
                  Clear All Data
                </>
              )}
            </Button>
            {clearStatus === 'success' && (
              <span className="flex items-center text-green-600">
                <CheckCircle className="w-5 h-5 mr-1" />
                Data cleared successfully
              </span>
            )}
            {clearStatus === 'error' && (
              <span className="flex items-center text-red-600">
                <XCircle className="w-5 h-5 mr-1" />
                Error: {clearError}
              </span>
            )}
          </div>

          {clearLogs.length > 0 && (
            <div className="mt-4">
              <details className="text-sm" open={clearStatus === 'success'}>
                <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                  View clear logs ({clearLogs.length} entries)
                </summary>
                <div className="mt-2 p-3 bg-white rounded max-h-48 overflow-y-auto font-mono text-xs border">
                  {clearLogs.map((log, i) => (
                    <div key={i} className="py-0.5">{log}</div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 2: Run Migrations</CardTitle>
          <CardDescription>
            Run all migrations in sequence or run individual steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Button
              onClick={runAllMigrations}
              disabled={isRunning}
              size="lg"
            >
              {isRunning && currentStep ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run All Migrations
                </>
              )}
            </Button>
            <Button
              onClick={resetAll}
              variant="outline"
              disabled={isRunning}
            >
              Reset Status
            </Button>
          </div>

          {(completedCount > 0 || errorCount > 0) && (
            <div className="mt-4 flex gap-4 text-sm">
              <span className="text-green-600">Completed: {completedCount}</span>
              {errorCount > 0 && (
                <span className="text-red-600">Errors: {errorCount}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800">Important Notes</h3>
            <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
              <li>Migrations must run in order (organisations first, then users, etc.)</li>
              <li>All migrated users will need to reset their passwords</li>
              <li>Existing records will be skipped (safe to re-run)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card
            key={step.id}
            className={currentStep === step.id ? 'ring-2 ring-blue-500' : ''}
          >
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{index + 1}.</span>
                    <h3 className="font-semibold">{step.name}</h3>
                    {step.count !== undefined && step.status === 'success' && (
                      <span className="text-sm text-green-600">
                        ({step.count} records)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <Button
                    onClick={() => runSingleStep(step.id)}
                    disabled={isRunning}
                    variant="outline"
                    size="sm"
                  >
                    Run
                  </Button>
                </div>
              </div>

              {step.error && (
                <div className="mt-3 p-3 bg-red-50 text-red-700 rounded text-sm">
                  Error: {step.error}
                </div>
              )}

              {step.logs.length > 0 && (
                <div className="mt-3">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                      View logs ({step.logs.length} entries)
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded max-h-48 overflow-y-auto font-mono text-xs">
                      {step.logs.map((log, i) => (
                        <div key={i} className="py-0.5">{log}</div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
