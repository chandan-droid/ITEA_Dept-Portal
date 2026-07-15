import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeApi } from '../../core/api/employeeApi';
import { Table } from '../../shared/components/Table';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { Search, Eye, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebounce } from '../../shared/hooks/useDebounce';

export const EmployeesScreen = () => {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  const loadEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        size,
        search: debouncedSearch.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        sort: 'displayName,asc'
      };
      const response = await employeeApi.getAll(params);
      setEmployees(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (err) {
      console.error('Failed to load employee list', err);
      setError(err.message || 'Access denied or server error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [page, debouncedSearch, roleFilter, statusFilter]);

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
    }
  };

  const columns = [
    {
      header: 'Employee ID',
      accessor: (row) => <span className="font-mono font-semibold text-primary">{row.employeeId}</span>,
      className: 'w-32',
    },
    {
      header: 'Name',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-light/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/10">
            {row.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <span className="font-semibold text-secondary-dark">{row.displayName}</span>
        </div>
      ),
    },
    {
      header: 'Email',
      accessor: 'email',
    },
    {
      header: 'Roles',
      accessor: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles && row.roles.map(r => (
            <span key={r} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {r.replace('ROLE_', '')}
            </span>
          ))}
        </div>
      ),
      className: 'w-40',
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />,
      className: 'w-28',
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <button
          onClick={() => navigate(`/employees/${row.userId}`)}
          className="p-1.5 hover:bg-slate-100 rounded text-gray-500 hover:text-primary transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="View Details"
        >
          <Eye size={15} />
          <span>Details</span>
        </button>
      ),
      className: 'w-24',
    },
  ];

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-secondary-dark tracking-tight">Team Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse and query mapped employee identities synchronized from the directory.
          </p>
        </div>
        <button
          onClick={loadEmployees}
          className="p-2 hover:bg-slate-200 border border-gray-200 bg-white rounded-large text-gray-600 hover:text-secondary-dark transition-colors"
          title="Refresh List"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 p-6 rounded-large text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-dark text-lg">Failed to load Employees</h3>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
          <button onClick={loadEmployees} className="md-button-primary mx-auto text-xs py-2 px-4">
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {/* Filters Panel */}
          <div className="bg-white border border-gray-200/60 p-4 rounded-large shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-xs shadow-sm rounded-large">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Search ID, Name, or Email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="md-input pl-10 !py-2"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(0);
                }}
                className="bg-white border border-gray-200 rounded-large px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 text-secondary-dark cursor-pointer transition-colors hover:border-gray-300"
              >
                <option value="">All Roles</option>
                <option value="ROLE_ADMIN">Admin</option>
                <option value="ROLE_MANAGER">Manager</option>
                <option value="ROLE_USER">User</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                className="bg-white border border-gray-200 rounded-large px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 text-secondary-dark cursor-pointer transition-colors hover:border-gray-300"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="LOCKED">Locked</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <Table
            columns={columns}
            data={employees}
            keyExtractor={(row) => row.userId}
            isLoading={loading}
            emptyMessage="No employees found matching the current search parameters."
          />

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex justify-between items-center bg-white border border-gray-200/60 px-4 py-3 rounded-large shadow-sm">
              <span className="text-xs font-semibold text-gray-500">
                Page <span className="text-secondary-dark font-bold">{page + 1}</span> of{' '}
                <span className="text-secondary-dark font-bold">{totalPages}</span> ({totalElements} total entries)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0}
                  className="p-1.5 border border-gray-200 rounded-large hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages - 1}
                  className="p-1.5 border border-gray-200 rounded-large hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
