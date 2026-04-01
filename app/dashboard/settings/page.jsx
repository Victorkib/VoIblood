'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, Lock, Users, Shield } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account')

  const tabs = [
    { id: 'account', label: 'Account', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'team', label: 'Team & Users', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-foreground/60">Manage your account and system preferences</p>
      </div>

      {/* Tab Navigation */}
      <Card className="p-4 flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </Card>

      {/* Account Settings */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Account Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                  <Input defaultValue="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <Input type="email" defaultValue="john@hospital.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Organization</label>
                <Input defaultValue="City Blood Bank" />
              </div>
              <div className="pt-4">
                <Button>Save Changes</Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Change Password</h3>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Current Password</label>
                <Input type="password" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                <Input type="password" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                <Input type="password" />
              </div>
              <Button>Update Password</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Notification Preferences</h3>
          <div className="space-y-4">
            {[
              { id: 'expiry', label: 'Expiry Alerts', description: 'Get notified when blood units are approaching expiration' },
              { id: 'requests', label: 'Request Status Updates', description: 'Receive updates on hospital blood requests' },
              { id: 'lowstock', label: 'Low Stock Alerts', description: 'Be notified when blood inventory reaches low levels' },
              { id: 'maintenance', label: 'System Maintenance', description: 'Important updates about system maintenance and upgrades' },
              { id: 'reports', label: 'Weekly Reports', description: 'Receive weekly summary reports of system activity' },
            ].map((item) => (
              <div key={`notif-${item.id}`} className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-secondary/5 transition">
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-foreground/60 mt-1">{item.description}</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border mt-1" />
              </div>
            ))}
            <div className="pt-4">
              <Button>Save Preferences</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Team & Users */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Team Members</h3>
              <Button size="sm">Add User</Button>
            </div>
            <div className="space-y-4">
              {[
                { id: 'user1', name: 'John Doe', email: 'john@hospital.com', role: 'Admin' },
                { id: 'user2', name: 'Jane Smith', email: 'jane@hospital.com', role: 'Staff' },
                { id: 'user3', name: 'Mike Johnson', email: 'mike@hospital.com', role: 'Staff' },
              ].map((user) => (
                <div key={`team-${user.id}`} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-sm text-foreground/60">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <select className="px-3 py-1 rounded border border-border bg-background text-foreground text-sm">
                      <option>{user.role}</option>
                      <option>Admin</option>
                      <option>Staff</option>
                    </select>
                    <button className="text-destructive hover:underline text-sm">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Security Settings</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">Two-Factor Authentication</h4>
              <p className="text-sm text-foreground/60 mb-4">Add an extra layer of security to your account</p>
              <Button>Enable 2FA</Button>
            </div>
            <div className="border-t border-border pt-6">
              <h4 className="font-medium text-foreground mb-3">Active Sessions</h4>
              <p className="text-sm text-foreground/60 mb-4">Manage your active login sessions</p>
              <div className="space-y-3">
                {[
                  { id: 'session1', device: 'Chrome on Windows', location: 'New York, USA', time: 'Active now' },
                  { id: 'session2', device: 'Safari on macOS', location: 'New York, USA', time: 'Last seen 2 hours ago' },
                ].map((session) => (
                  <div key={`session-${session.id}`} className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{session.device}</p>
                      <p className="text-xs text-foreground/60">{session.location} • {session.time}</p>
                    </div>
                    <button className="text-sm text-destructive hover:underline">Sign Out</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
