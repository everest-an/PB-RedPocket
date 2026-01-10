"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { cn } from "@/lib/utils"
import {
  User,
  Building2,
  Shield,
  Bell,
  CreditCard,
  Link2,
  Key,
  Mail,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Smartphone,
} from "lucide-react"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "company" | "security" | "notifications" | "integrations">(
    "profile",
  )

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "company" as const, label: "Company", icon: Building2 },
    { id: "security" as const, label: "Security", icon: Shield },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "integrations" as const, label: "Integrations", icon: Link2 },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all",
              activeTab === tab.id
                ? "bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-foreground border border-orange-500/30"
                : "bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10",
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "profile" && <ProfileSettings />}
      {activeTab === "company" && <CompanySettings />}
      {activeTab === "security" && <SecuritySettings />}
      {activeTab === "notifications" && <NotificationSettings />}
      {activeTab === "integrations" && <IntegrationSettings />}
    </div>
  )
}

function ProfileSettings() {
  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Personal Information</h3>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-3xl font-bold text-white">
              JD
            </div>
            <button className="text-sm text-orange-400 hover:underline">Change Avatar</button>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">First Name</label>
              <input
                type="text"
                defaultValue="John"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Last Name</label>
              <input
                type="text"
                defaultValue="Doe"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input
                type="email"
                defaultValue="john@company.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
              <input
                type="tel"
                defaultValue="+1 234 567 8900"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <GradientButton>Save Changes</GradientButton>
        </div>
      </GlassCard>
    </div>
  )
}

function CompanySettings() {
  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Company Name</label>
            <input
              type="text"
              defaultValue="Acme Corp"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Website</label>
            <input
              type="url"
              defaultValue="https://acme.com"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Industry</label>
            <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50">
              <option>Technology</option>
              <option>Finance</option>
              <option>Gaming</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Team Size</label>
            <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50">
              <option>1-10</option>
              <option>11-50</option>
              <option>51-200</option>
              <option>200+</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">Company Description</label>
            <textarea
              rows={3}
              defaultValue="Building the future of decentralized applications."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50 resize-none"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <GradientButton>Save Changes</GradientButton>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Billing Information</h3>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20">
            <CreditCard className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Visa ending in 4242</p>
            <p className="text-sm text-muted-foreground">Expires 12/2026</p>
          </div>
          <button className="text-sm text-orange-400 hover:underline">Update</button>
        </div>
      </GlassCard>
    </div>
  )
}

function SecuritySettings() {
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Password</h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Current Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Confirm New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <GradientButton>Update Password</GradientButton>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground mt-1">Add an extra layer of security to your account</p>
          </div>
          <button
            onClick={() => setTwoFAEnabled(!twoFAEnabled)}
            className={cn(
              "relative w-14 h-7 rounded-full transition-colors",
              twoFAEnabled ? "bg-green-500" : "bg-neutral-700",
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform",
                twoFAEnabled ? "translate-x-8" : "translate-x-1",
              )}
            />
          </button>
        </div>
        {twoFAEnabled && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-sm text-green-400">Two-factor authentication is enabled</span>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">API Keys</h3>
        <p className="text-sm text-muted-foreground mb-4">Manage API keys for programmatic access</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Production Key</p>
                <code className="text-xs text-muted-foreground">pk_live_****...****</code>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Test Key</p>
                <code className="text-xs text-muted-foreground">pk_test_****...****</code>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
        <button className="mt-4 text-sm text-orange-400 hover:underline">+ Generate New Key</button>
      </GlassCard>
    </div>
  )
}

function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    email_claims: true,
    email_deposits: true,
    email_reports: false,
    push_claims: true,
    push_low_balance: true,
  })

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-semibold text-foreground">Email Notifications</h3>
        </div>
        <div className="space-y-4">
          {[
            {
              key: "email_claims" as const,
              label: "Claim Notifications",
              desc: "Get notified when someone claims a red pocket",
            },
            {
              key: "email_deposits" as const,
              label: "Deposit Confirmations",
              desc: "Receive confirmation when deposits are completed",
            },
            {
              key: "email_reports" as const,
              label: "Weekly Reports",
              desc: "Receive weekly summary of your campaigns",
            },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div>
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <button
                onClick={() => toggleNotification(item.key)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  notifications[item.key] ? "bg-orange-500" : "bg-neutral-700",
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    notifications[item.key] ? "translate-x-7" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Smartphone className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-foreground">Push Notifications</h3>
        </div>
        <div className="space-y-4">
          {[
            { key: "push_claims" as const, label: "Real-time Claims", desc: "Instant notifications for new claims" },
            { key: "push_low_balance" as const, label: "Low Balance Alerts", desc: "Get alerted when balance is low" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div>
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <button
                onClick={() => toggleNotification(item.key)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  notifications[item.key] ? "bg-cyan-500" : "bg-neutral-700",
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    notifications[item.key] ? "translate-x-7" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}

function IntegrationSettings() {
  const integrations = [
    { platform: "telegram" as const, name: "Telegram Bot", status: "connected", botName: "@YourCompanyBot" },
    { platform: "discord" as const, name: "Discord Bot", status: "connected", botName: "RedPocket#1234" },
    { platform: "whatsapp" as const, name: "WhatsApp Business", status: "pending", botName: "" },
    { platform: "github" as const, name: "GitHub Action", status: "connected", botName: "protocol-bank-action" },
  ]

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Platform Integrations</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Connect your social platforms to enable red pocket distribution
        </p>
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.platform}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-4">
                <PlatformIcon platform={integration.platform} className="w-8 h-8" />
                <div>
                  <p className="font-medium text-foreground">{integration.name}</p>
                  {integration.botName && <p className="text-sm text-muted-foreground">{integration.botName}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {integration.status === "connected" ? (
                  <>
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </span>
                    <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Configure
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                      <AlertCircle className="w-3 h-3" />
                      Pending
                    </span>
                    <GradientButton className="text-sm py-1.5 px-4">Connect</GradientButton>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Webhook Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">Receive real-time notifications via webhooks</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Webhook URL</label>
            <input
              type="url"
              placeholder="https://your-server.com/webhook"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Events to Subscribe</label>
            <div className="flex flex-wrap gap-2">
              {["claim.created", "claim.completed", "campaign.created", "deposit.confirmed"].map((event) => (
                <button
                  key={event}
                  className="px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/30 text-sm text-orange-400"
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          <GradientButton>Save Webhook</GradientButton>
        </div>
      </GlassCard>
    </div>
  )
}
