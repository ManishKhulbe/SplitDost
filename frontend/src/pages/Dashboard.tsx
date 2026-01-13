import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { expensesApi, groupsApi, balancesApi } from '../services/api'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCurrency, setExpenseCurrency] = useState(user?.defaultCurrency || 'INR')

  // Fetch personal expenses
  const { data: personalExpensesData } = useQuery({
    queryKey: ['personalExpenses'],
    queryFn: expensesApi.getPersonal
  })

  // Fetch groups
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.getAll
  })

  // Fetch balance summary
  const { data: balanceSummary } = useQuery({
    queryKey: ['balanceSummary'],
    queryFn: balancesApi.getSummary
  })

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: groupsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setShowCreateGroup(false)
      setGroupName('')
    }
  })

  // Create personal expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: (data: { title: string; amount: number; currency: string }) =>
      expensesApi.createPersonal(data.title, data.amount, data.currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalExpenses'] })
      setShowAddExpense(false)
      setExpenseTitle('')
      setExpenseAmount('')
    }
  })

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (groupName.trim()) {
      createGroupMutation.mutate(groupName.trim())
    }
  }

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (expenseTitle.trim() && expenseAmount) {
      createExpenseMutation.mutate({
        title: expenseTitle.trim(),
        amount: parseFloat(expenseAmount),
        currency: expenseCurrency
      })
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">SplitDost</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {user?.name}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Summary */}
        {balanceSummary && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Balance Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">You are owed</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    balanceSummary.summary.totalOwed,
                    balanceSummary.summary.currency
                  )}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">You owe</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    balanceSummary.summary.totalOwes,
                    balanceSummary.summary.currency
                  )}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${balanceSummary.summary.netBalance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                <p className="text-sm text-gray-600">Net Balance</p>
                <p className={`text-2xl font-bold ${balanceSummary.summary.netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(
                    Math.abs(balanceSummary.summary.netBalance),
                    balanceSummary.summary.currency
                  )}
                  {balanceSummary.summary.netBalance >= 0 ? ' (owed to you)' : ' (you owe)'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Expenses */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Personal Expenses</h2>
              <button
                onClick={() => setShowAddExpense(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition text-sm"
              >
                + Add Expense
              </button>
            </div>

            {personalExpensesData?.expenses?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No personal expenses yet</p>
            ) : (
              <div className="space-y-2">
                {personalExpensesData?.expenses?.map((expense: any) => (
                  <div key={expense.id} className="border-b pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{expense.title}</span>
                      <span>{formatCurrency(expense.amount, expense.currency)}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Groups */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Groups</h2>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition text-sm"
              >
                + Create Group
              </button>
            </div>

            {groupsData?.groups?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No groups yet. Create one to get started!</p>
            ) : (
              <div className="space-y-2">
                {groupsData?.groups?.map((group: any) => (
                  <div
                    key={group.id}
                    onClick={() => navigate(`/groups/${group.id}`)}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <h3 className="font-semibold text-lg">{group.name}</h3>
                    <p className="text-sm text-gray-500">
                      {group.members?.length || 0} members
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Create Group</h3>
            <form onSubmit={handleCreateGroup}>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createGroupMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Personal Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Add Personal Expense</h3>
            <form onSubmit={handleAddExpense}>
              <input
                type="text"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                placeholder="Title"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div className="flex gap-2 mb-4">
                <input
                  type="number"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="Amount"
                  required
                  min="0"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={expenseCurrency}
                  onChange={(e) => setExpenseCurrency(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createExpenseMutation.isPending}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createExpenseMutation.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

