import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar, LineChart, Line, AreaChart, Area } from 'recharts';
import { AlertCircle, Clock, CheckCircle, AlertTriangle, TrendingUp, CalendarDays, Package, Truck, Users, ShoppingCart, BarChart3 } from 'lucide-react';

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
    <div className="p-4 flex flex-col gap-6 max-w-full bg-gradient-to-b from-blue-50 to-white min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-lg shadow-lg text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manufacturing Orders Dashboard</h1>
            <p className="text-blue-100 mt-1">Visualize and track your manufacturing order pipeline</p>
          </div>
          <div className="hidden md:block">
            <Package className="h-12 w-12" />
          </div>
        </div>
      </div>
      
      {/* File Upload Section */}
      <div className="mb-6">
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer bg-gradient-to-b from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 transition-colors duration-300 shadow-sm">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <div className="bg-blue-100 rounded-full p-3 mb-4">
                <CalendarDays className="w-8 h-8 text-blue-600" />
              </div>
              <p className="mb-2 text-lg text-gray-700"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-sm text-gray-500">CSV or TSV file with order data</p>
              <p className="mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Transform your data instantly</p>
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
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-blue-800 mb-4"></div>
          <p className="text-blue-800 font-medium">Processing your data...</p>
        </div>
      )}
      
      {error && (
        <div className="text-center py-8 mx-auto max-w-lg">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-md">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {processedData.length > 0 && (
        <>
          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
                  Total Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{processedData.length}</div>
                <p className="text-xs text-blue-500 mt-1">Manufacturing line items</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-white to-yellow-50 border border-yellow-100 shadow hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-700 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-yellow-600" />
                  Due Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-900">
                  {processedData.filter(item => item.daysUntilShipment === 0).length}
                </div>
                <p className="text-xs text-yellow-600 mt-1">Requires immediate attention</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-white to-orange-50 border border-orange-100 shadow hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                  At Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-900">
                  {processedData.filter(item => 
                    item.statusCategory === 'At Risk' || 
                    item.statusCategory === 'On Hold' || 
                    item.statusCategory === 'Late'
                  ).length}
                </div>
                <p className="text-xs text-orange-600 mt-1">Potential delay or issues</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-white to-green-50 border border-green-100 shadow hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-600" />
                  Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900">
                  {new Set(processedData.map(item => item.Name)).size}
                </div>
                <p className="text-xs text-green-600 mt-1">Unique customer accounts</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Analytics Overview */}
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Analytics Overview
            </h2>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Orders by ETA Date Chart */}
            <Card className="shadow-lg border border-blue-100 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
                <CardTitle className="flex items-center text-blue-800">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  Orders by ETA Date
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ordersByDate}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="date" tick={{fill: '#4b5563'}} />
                      <YAxis allowDecimals={false} tick={{fill: '#4b5563'}} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '8px',
                          borderColor: '#e5e7eb',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="count" 
                        name="Number of Orders" 
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                      >
                        {ordersByDate.map((entry, index) => {
                          const colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Status Distribution Chart */}
            <Card className="shadow-lg border border-blue-100 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
                <CardTitle className="flex items-center text-blue-800">
                  <div className="h-5 w-5 mr-2 text-blue-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                      <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                    </svg>
                  </div>
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={90}
                        innerRadius={30}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                        paddingAngle={2}
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={statusColors[entry.status] || '#6b7280'} 
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '8px',
                          borderColor: '#e5e7eb',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Additional Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Top Customers Chart */}
            <Card className="shadow-lg border border-blue-100 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">Top Customers</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topCustomers.slice(0, 5)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fontSize: 12 }}
                        width={100}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Timeline View */}
            <Card className="shadow-lg border border-blue-100 overflow-hidden md:col-span-2">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">Delivery Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={ordersByDate.filter(d => d.date !== 'TBD')}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Order Details Title */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Truck className="h-5 w-5 mr-2 text-blue-600" />
              Order Details
            </h2>
            <p className="text-sm text-gray-500">Detailed view of all manufacturing orders</p>
          </div>
          
          {/* Table View */}
          <Card className="shadow-xl border border-blue-100 overflow-hidden rounded-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
              <CardTitle className="text-blue-800">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">ETA Date</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Customer</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Order #</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Part #</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Description</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Ship By</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {processedData.map((order, idx) => (
                      <tr 
                        key={idx} 
                        className={`${getStatusColor(order.statusCategory)} transition-colors duration-150 hover:bg-blue-50`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="p-1 rounded-full bg-white shadow-sm">
                              <StatusIcon status={order.statusCategory} />
                            </div>
                            <span className="ml-2 text-sm font-medium">{order.statusCategory}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{order.etaDate}</div>
                          {order.daysUntilShipment !== null && (
                            <div className="text-xs text-gray-500">
                              {order.daysUntilShipment === 0 
                                ? "Due today" 
                                : order.daysUntilShipment > 0 
                                  ? `${order.daysUntilShipment} days left`
                                  : `${Math.abs(order.daysUntilShipment)} days overdue`
                              }
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{order.Name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{order.Order}</div>
                          <div className="text-xs text-gray-500">Line: {order.Line}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{order[' Part']}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 max-w-xs truncate">{order.Desc}</div>
                          <div className="text-xs text-gray-500">{order.OrderQty} units</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{order.ShipBy}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{order.status}</td>
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
