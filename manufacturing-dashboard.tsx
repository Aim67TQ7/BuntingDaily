import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const ManufacturingDashboard = () => {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ordersByDate, setOrdersByDate] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  
  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsLoading(true);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              setData(results.data);
              processData(results.data);
              setIsLoading(false);
            },
            error: (error) => {
              setError(`Error parsing CSV: ${error.message}`);
              setIsLoading(false);
            }
          });
        } catch (error) {
          setError(`Error reading file: ${error.message}`);
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('Error reading file');
        setIsLoading(false);
      };
      
      reader.readAsText(selectedFile);
    }
  };
  
  const processData = (rawData) => {
    try {
      // Process and extract data from the Recovery Date field
      const processed = rawData.map(row => {
        const recoveryDate = row['Recovery Date'] || '';
        
        // Extract ETA date and status
        let etaDate = 'TBD';
        let status = '';
        let statusCategory = 'Unknown';
        
        if (recoveryDate) {
          // Extract date
          const dateMatch = recoveryDate.match(/ETA\s+(\d+\/\d+)/);
          if (dateMatch) {
            etaDate = dateMatch[1] + '/25'; // Assuming 2025
          }
          
          // Extract status notes
          if (recoveryDate.includes('\n')) {
            const parts = recoveryDate.split('\n').map(part => part.trim()).filter(Boolean);
            status = parts.filter(part => !part.startsWith('ETA')).join(' ');
          }
          
          // Determine status category
          if (status.includes('PENDING')) statusCategory = 'Pending';
          else if (status.includes('COMPLETE')) statusCategory = 'Complete';
          else if (status.includes('POSSIBLE DATE SLIDE')) statusCategory = 'At Risk';
          else if (status.includes('CREDIT HOLD')) statusCategory = 'On Hold';
          else if (etaDate === 'TBD') statusCategory = 'Pending';
          else {
            const today = new Date();
            const etaParts = etaDate.split('/');
            const etaObj = new Date(2025, parseInt(etaParts[0])-1, parseInt(etaParts[1]));
            
            if (etaObj < today) {
              statusCategory = 'Late';
            } else {
              statusCategory = 'On Time';
            }
          }
        }
        
        // Calculate days until ship date
        let daysUntilShipment = null;
        if (row.ShipBy) {
          const today = new Date();
          const shipByParts = row.ShipBy.split('/');
          if (shipByParts.length === 3) {
            const shipByDate = new Date(`20${shipByParts[2]}-${shipByParts[0]}-${shipByParts[1]}`);
            daysUntilShipment = Math.ceil((shipByDate - today) / (1000 * 60 * 60 * 24));
          }
        }
        
        return {
          ...row,
          etaDate,
          status,
          statusCategory,
          daysUntilShipment
        };
      });
      
      setProcessedData(processed);
      
      // Calculate orders by ETA date
      const groupedByDate = _.groupBy(processed, 'etaDate');
      const ordersDateData = Object.entries(groupedByDate).map(([date, orders]) => ({
        date,
        count: orders.length
      })).sort((a, b) => {
        if (a.date === 'TBD') return 1;
        if (b.date === 'TBD') return -1;
        const [aMonth, aDay] = a.date.split('/').map(Number);
        const [bMonth, bDay] = b.date.split('/').map(Number);
        return (aMonth * 100 + aDay) - (bMonth * 100 + bDay);
      });
      setOrdersByDate(ordersDateData);
      
      // Calculate status distribution
      const groupedByStatus = _.groupBy(processed, 'statusCategory');
      const statusData = Object.entries(groupedByStatus).map(([status, orders]) => ({
        status,
        count: orders.length
      }));
      setStatusDistribution(statusData);
      
      // Calculate top customers
      const groupedByCustomer = _.groupBy(processed, 'Name');
      const customerData = Object.entries(groupedByCustomer)
        .map(([name, orders]) => ({
          name,
          count: orders.length
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopCustomers(customerData);
      
    } catch (error) {
      setError(`Error processing data: ${error.message}`);
    }
  };
  
  // Helper to determine row background based on status
  const getStatusColor = (status) => {
    switch (status) {
      case 'Complete': return 'bg-green-100';
      case 'On Time': return 'bg-blue-50';
      case 'Pending': return 'bg-yellow-50';
      case 'At Risk': return 'bg-orange-100';
      case 'On Hold': return 'bg-red-100';
      case 'Late': return 'bg-red-100';
      default: return '';
    }
  };
  
  // Helper to get status icon
  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'Complete': 
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'On Time': 
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'Pending': 
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'At Risk': 
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'On Hold': 
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'Late': 
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: 
        return null;
    }
  };
  
  // Status colors for charts
  const statusColors = {
    'Complete': '#22c55e',
    'On Time': '#3b82f6',
    'Pending': '#eab308',
    'At Risk': '#f97316',
    'On Hold': '#ef4444',
    'Late': '#b91c1c',
    'Unknown': '#6b7280'
  };
  
  return (
    <div className="p-4 flex flex-col gap-6 max-w-full">
      <h1 className="text-2xl font-bold">Manufacturing Orders Dashboard</h1>
      
      {/* File Upload Section */}
      <div className="mb-6">
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
              </svg>
              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-gray-500">CSV or TSV file with order data</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept=".csv,.tsv,.txt" 
              onChange={handleFileUpload} 
            />
          </label>
        </div>
      </div>
      
      {/* Loading and Error States */}
      {isLoading && <div className="text-center py-4">Loading data...</div>}
      {error && <div className="text-center py-4 text-red-500">{error}</div>}
      
      {processedData.length > 0 && (
        <>
          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{processedData.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Orders Due Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {processedData.filter(item => item.daysUntilShipment === 0).length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">At Risk Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {processedData.filter(item => 
                    item.statusCategory === 'At Risk' || 
                    item.statusCategory === 'On Hold' || 
                    item.statusCategory === 'Late'
                  ).length}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Orders by ETA Date Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Orders by ETA Date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ordersByDate}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="Number of Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Status Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={statusColors[entry.status] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Table View */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETA Date</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part #</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ship By</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {processedData.map((order, idx) => (
                      <tr key={idx} className={getStatusColor(order.statusCategory)}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <StatusIcon status={order.statusCategory} />
                            <span className="ml-2 text-sm">{order.statusCategory}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{order.etaDate}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{order.Name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{order.Order}-{order.Line}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{order[' Part']}</td>
                        <td className="px-4 py-2 text-sm max-w-xs truncate">{order.Desc}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{order.ShipBy}</td>
                        <td className="px-4 py-2 text-sm max-w-xs truncate">{order.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ManufacturingDashboard;
