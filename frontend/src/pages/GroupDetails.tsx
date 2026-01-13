import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { groupsApi, balancesApi, usersApi } from '../services/api'

export default function GroupDetails() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCurrency, setExpenseCurrency] = useState('INR')
  const [expensePaidBy, setExpensePaidBy] = useState('')
  const [splitType, setSplitType] = useState<'equal' | 'unequal'>('equal')
  const [unequalSplits, setUnequalSplits] = useState<Record<string, string>>({})
  
  // Add member state
  const [showAddMember, setShowAddMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch group expenses
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['groupExpenses', groupId],
    queryFn: () => groupsApi.getExpenses(groupId!),
    enabled: !!groupId
  })

  // Fetch group balances
  const { data: balancesData, isLoading: balancesLoading } = useQuery({
    queryKey: ['groupBalances', groupId],
    queryFn: () => balancesApi.getGroupBalances(groupId!),
    enabled: !!groupId
  })

  // Fetch groups to get group info
  const { data: groupsData, refetch: refetchGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.getAll
  })

  const currentGroup = groupsData?.groups?.find((g: any) => g.id === groupId)
  const groupMembers = currentGroup?.members || []

  // Search users
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsSearching(true)
      
      // Debounce search
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const data = await usersApi.search(searchQuery.trim())
          // Filter out users who are already members
          // Get current members from groupsData to avoid dependency issues
          const currentMembers = groupsData?.groups?.find((g: any) => g.id === groupId)?.members || []
          const filteredUsers = data.users.filter((u: any) => 
            !currentMembers.some((m: any) => m.id === u.id)
          )
          setSearchResults(filteredUsers)
        } catch (error) {
          console.error('Search error:', error)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      }, 300)
    } else {
      setSearchResults([])
      setIsSearching(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, groupsData, groupId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSearchResults([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: (userIds: string[]) => groupsApi.addMembers(groupId!, userIds),
    onSuccess: async (data) => {
      // Update the groups cache with the response data if available
      if (data?.group) {
        queryClient.setQueryData(['groups'], (oldData: any) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            groups: oldData.groups.map((g: any) =>
              g.id === groupId ? data.group : g
            )
          }
        })
      }
      // Invalidate and refetch groups to get updated member list
      await queryClient.invalidateQueries({ queryKey: ['groups'] })
      await refetchGroups()
      queryClient.invalidateQueries({ queryKey: ['groupBalances', groupId] })
      setShowAddMember(false)
      setSearchQuery('')
      setSearchResults([])
      setSelectedUser(null)
    }
  })

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: (data: {
      title: string
      amount: number
      currency: string
      paidBy?: string
      splitType: 'equal' | 'exact'
      splits?: Array<{ userId: string; amount: number }>
    }) => groupsApi.createExpense(groupId!, data.title, data.amount, data.currency, data.paidBy, data.splitType, data.splits),
    onSuccess: async () => {
      // Close modal first to prevent UI issues
      setShowAddExpense(false)
      setExpenseTitle('')
      setExpenseAmount('')
      setExpensePaidBy('')
      setSplitType('equal')
      setUnequalSplits({})
      
      // Then invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['groupExpenses', groupId] })
      await queryClient.invalidateQueries({ queryKey: ['groupBalances', groupId] })
      queryClient.invalidateQueries({ queryKey: ['balanceSummary'] })
    },
    onError: (error: any) => {
      console.error('Error creating expense:', error)
      alert(error.response?.data?.error || 'Failed to create expense. Please try again.')
    }
  })

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (expenseTitle.trim() && expenseAmount && expensePaidBy) {
      if (splitType === 'unequal') {
        // Validate unequal splits
        const splits = Object.entries(unequalSplits)
          .filter(([_, amount]) => amount && parseFloat(amount) > 0)
          .map(([userId, amount]) => ({
            userId,
            amount: parseFloat(amount)
          }))

        const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0)
        const expenseTotal = parseFloat(expenseAmount)

        if (Math.abs(totalSplit - expenseTotal) > 0.01) {
          alert(`Split amounts (${totalSplit.toFixed(2)}) must equal the total amount (${expenseTotal.toFixed(2)})`)
          return
        }

        if (splits.length === 0) {
          alert('Please enter amounts for at least one member')
          return
        }

        createExpenseMutation.mutate({
          title: expenseTitle.trim(),
          amount: expenseTotal,
          currency: expenseCurrency,
          paidBy: expensePaidBy,
          splitType: 'exact', // Backend uses 'exact' for unequal splits
          splits
        })
      } else {
        createExpenseMutation.mutate({
          title: expenseTitle.trim(),
          amount: parseFloat(expenseAmount),
          currency: expenseCurrency,
          paidBy: expensePaidBy,
          splitType: 'equal'
        })
      }
    }
  }

  const formatCurrency = (amount: number | string, currency: string) => {
    const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return `${symbols[currency] || currency} ${(numAmount || 0).toFixed(2)}`
  }

  // Get user's balance from the balances data
  const userBalance = balancesData?.balances?.find((b: any) => b.userId === user?.id)

  // Show loading state while groups are being fetched
  if (groupsLoading && !currentGroup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading group...</p>
        </div>
      </div>
    )
  }

  if (!currentGroup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Group not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{currentGroup.name}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddMember(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            >
              + Add Member
            </button>
            <button
              onClick={() => setShowAddExpense(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
            >
              + Add Expense
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Group Members Section */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Group Members</h2>
          {groupMembers.length === 0 ? (
            <p className="text-gray-500">No members in this group</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {groupMembers.map((member: any) => (
                <div
                  key={member.id}
                  className={`px-4 py-2 rounded-full border-2 ${
                    member.id === user?.id
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <span className="font-medium">{member.name}</span>
                  {member.id === user?.id && (
                    <span className="ml-2 text-sm text-indigo-600">(You)</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Balance Summary */}
        {balancesLoading ? (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Loading balances...</p>
          </div>
        ) : userBalance ? (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Balance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userBalance.net > 0 ? (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">You are owed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(userBalance.net, userBalance.currency)}
                  </p>
                </div>
              ) : userBalance.net < 0 ? (
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">You owe</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(Math.abs(userBalance.net), userBalance.currency)}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">All settled up!</p>
                  <p className="text-2xl font-bold text-gray-600">₹0.00</p>
                </div>
              )}
            </div>

            {/* Breakdown */}
            {userBalance.breakdown && userBalance.breakdown.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Breakdown</h3>
                <div className="space-y-2">
                  {userBalance.breakdown.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{item.expenseTitle}</p>
                        <p className="text-sm text-gray-600">
                          {item.type === 'owed' ? `${item.otherUserName} owes you` : `You owe ${item.otherUserName}`}
                        </p>
                      </div>
                      <p className={`font-semibold ${item.type === 'owed' ? 'text-green-600' : 'text-red-600'}`}>
                        {item.type === 'owed' ? '+' : '-'}
                        {formatCurrency(item.amount, item.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* All Balances */}
        {balancesData && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">All Balances</h2>
            <div className="space-y-2">
              {balancesData.balances?.map((balance: any) => {
                const member = groupMembers.find((m: any) => m.id === balance.userId)
                if (!member) return null

                return (
                  <div key={balance.userId} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      {balance.userId === user?.id && <span className="text-xs text-gray-500">(You)</span>}
                    </div>
                    <div className="text-right">
                      {balance.net > 0 ? (
                        <p className="text-green-600 font-semibold">
                          Gets {formatCurrency(balance.net, balance.currency)}
                        </p>
                      ) : balance.net < 0 ? (
                        <p className="text-red-600 font-semibold">
                          Owes {formatCurrency(Math.abs(balance.net), balance.currency)}
                        </p>
                      ) : (
                        <p className="text-gray-500 font-semibold">Settled up</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Expenses List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Expenses</h2>
          {expensesLoading ? (
            <p className="text-gray-500">Loading expenses...</p>
          ) : expensesData?.expenses?.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No expenses yet. Add one to get started!</p>
          ) : (
            <div className="space-y-4">
              {expensesData?.expenses?.map((expense: any) => (
                <div key={expense.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{expense.title}</h3>
                      <p className="text-sm text-gray-500">
                        Paid by {expense.payer?.name} on {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-lg font-bold">
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-sm text-gray-600 mb-1">Split:</p>
                    <div className="space-y-1">
                      {expense.splits?.map((split: any) => (
                        <div key={split.id} className="flex justify-between text-sm">
                          <span>{split.user?.name}</span>
                          <span>{formatCurrency(parseFloat(split.amount) || 0, expense.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Add Member to Group</h3>
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search by name or email
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedUser(null)
                }}
                placeholder="Type to search users..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 mb-2"
                autoFocus
              />
              
              {/* Dropdown Results */}
              {searchQuery.trim().length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    <ul className="py-1">
                      {searchResults.map((user: any) => (
                        <li
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user)
                            setSearchQuery(user.name)
                            setSearchResults([])
                          }}
                          className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                            selectedUser?.id === user.id ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No users found. Try a different search term.
                    </div>
                  )}
                </div>
              )}

              {selectedUser && (
                <div className="mt-2 p-3 bg-indigo-50 rounded-md">
                  <p className="text-sm font-medium text-indigo-900">Selected:</p>
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddMember(false)
                  setSearchQuery('')
                  setSearchResults([])
                  setSelectedUser(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedUser) {
                    addMemberMutation.mutate([selectedUser.id])
                  }
                }}
                disabled={!selectedUser || addMemberMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Add Group Expense</h3>
            <form onSubmit={handleAddExpense}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    placeholder="Expense title"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paid By
                  </label>
                  <select
                    value={expensePaidBy}
                    onChange={(e) => setExpensePaidBy(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select member</option>
                    {groupMembers.map((member: any) => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.id === user?.id ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Split Type
                  </label>
                  <select
                    value={splitType}
                    onChange={(e) => {
                      setSplitType(e.target.value as 'equal' | 'unequal')
                      if (e.target.value === 'equal') {
                        setUnequalSplits({})
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="equal">Equal Split</option>
                    <option value="unequal">Unequal Split</option>
                  </select>
                </div>

                {/* Unequal Split Inputs */}
                {splitType === 'unequal' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Split Amounts
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
                      {groupMembers.map((member: any) => {
                        const memberAmount = unequalSplits[member.id] || ''
                        
                        return (
                          <div key={member.id} className="flex items-center gap-2">
                            <label className="flex-1 text-sm font-medium text-gray-700">
                              {member.name} {member.id === user?.id && '(You)'}
                            </label>
                            <div className="flex-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={memberAmount}
                                onChange={(e) => {
                                  setUnequalSplits({
                                    ...unequalSplits,
                                    [member.id]: e.target.value
                                  })
                                }}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 text-sm"
                              />
                            </div>
                          </div>
                        )
                      })}
                      {(() => {
                        const totalEntered = Object.values(unequalSplits).reduce(
                          (sum, val) => sum + (parseFloat(val as string) || 0),
                          0
                        )
                        const remaining = parseFloat(expenseAmount || '0') - totalEntered
                        
                        return (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Total Entered:</span>
                              <span className="font-medium">{totalEntered.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-gray-600">Remaining:</span>
                              <span className={`font-medium ${Math.abs(remaining) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                                {remaining.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-gray-600">Total Amount:</span>
                              <span className="font-medium">{parseFloat(expenseAmount || '0').toFixed(2)}</span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddExpense(false)
                    setExpenseTitle('')
                    setExpenseAmount('')
                    setExpensePaidBy('')
                    setSplitType('equal')
                    setUnequalSplits({})
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createExpenseMutation.isPending}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

