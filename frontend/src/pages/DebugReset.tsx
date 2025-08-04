import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

const DebugReset: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get all URL parts
  const fullUrl = window.location.href;
  const pathname = location.pathname;
  const search = location.search;
  const hash = location.hash;

  // Parse hash params
  const hashParams = new URLSearchParams(hash.substring(1));
  
  // Parse query params
  const queryParams = Object.fromEntries(searchParams.entries());

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reset Password Debug Info</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Full URL:</h3>
          <code className="text-sm">{fullUrl}</code>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">URL Parts:</h3>
          <div className="text-sm space-y-1">
            <div><strong>Pathname:</strong> {pathname}</div>
            <div><strong>Search:</strong> {search}</div>
            <div><strong>Hash:</strong> {hash}</div>
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Query Parameters:</h3>
          <pre className="text-sm">{JSON.stringify(queryParams, null, 2)}</pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Hash Parameters:</h3>
          <div className="text-sm space-y-1">
            <div><strong>access_token:</strong> {hashParams.get('access_token') || 'Not found'}</div>
            <div><strong>refresh_token:</strong> {hashParams.get('refresh_token') || 'Not found'}</div>
            <div><strong>type:</strong> {hashParams.get('type') || 'Not found'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugReset;
