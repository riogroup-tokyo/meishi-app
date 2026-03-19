"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/components/AuthProvider"
import { supabase } from "@/lib/supabase"
import { createSignupRequest } from "@/lib/actions"

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading, signIn, signUp } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/")
    }
  }, [authLoading, isAuthenticated, router])

  const [showPendingMessage, setShowPendingMessage] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({})
  const [loginLoading, setLoginLoading] = useState(false)

  // Signup form state
  const [signupDisplayName, setSignupDisplayName] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("")
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({})
  const [signupLoading, setSignupLoading] = useState(false)

  const validateLogin = (): boolean => {
    const errors: Record<string, string> = {}
    if (!loginEmail.trim()) {
      errors.email = "メールアドレスを入力してください"
    }
    if (!loginPassword) {
      errors.password = "パスワードを入力してください"
    }
    setLoginErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateSignup = (): boolean => {
    const errors: Record<string, string> = {}
    if (!signupDisplayName.trim()) {
      errors.displayName = "表示名を入力してください"
    }
    if (!signupEmail.trim()) {
      errors.email = "メールアドレスを入力してください"
    }
    if (!signupPassword) {
      errors.password = "パスワードを入力してください"
    } else if (signupPassword.length < 6) {
      errors.password = "パスワードは6文字以上で入力してください"
    }
    if (!signupPasswordConfirm) {
      errors.passwordConfirm = "パスワード（確認）を入力してください"
    } else if (signupPassword !== signupPasswordConfirm) {
      errors.passwordConfirm = "パスワードが一致しません"
    }
    setSignupErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateLogin()) return

    setLoginLoading(true)
    try {
      await signIn(loginEmail, loginPassword)
      toast.success("ログインしました")
      router.push("/")
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "ログインに失敗しました"
      toast.error(message)
      setLoginErrors({ form: message })
    } finally {
      setLoginLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateSignup()) return

    setSignupLoading(true)
    try {
      const user = await signUp(signupEmail, signupPassword, signupDisplayName.trim())

      if (user) {
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Create profile (not approved yet)
        const { error: profileErr } = await supabase.from("profiles").upsert({
          id: user.id,
          display_name: signupDisplayName.trim(),
          email: signupEmail.trim(),
        })
        if (profileErr) {
          console.error("Profile error:", profileErr)
        }

        // Set is_approved to false (separate update to avoid RLS issues with upsert)
        await supabase.from("profiles")
          .update({ is_approved: false } as Record<string, unknown>)
          .eq("id", user.id)

        // Create signup request for admin approval
        try {
          await createSignupRequest(user.id, signupDisplayName.trim(), signupEmail.trim())
        } catch (reqErr) {
          console.error("Signup request error:", reqErr)
          // Fallback: insert directly
          await supabase.from("signup_requests").insert({
            user_id: user.id,
            display_name: signupDisplayName.trim(),
            email: signupEmail.trim(),
            status: "pending",
          })
        }

        // Sign out - they can't use the app until approved
        await supabase.auth.signOut()
      }

      setShowPendingMessage(true)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "アカウント作成に失敗しました"
      toast.error(message)
      setSignupErrors({ form: message })
    } finally {
      setSignupLoading(false)
    }
  }

  // Show nothing while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show pending approval message after signup
  if (showPendingMessage) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="bg-[#b71c1c] text-center py-3 pb-2">
          <img src="https://ranking.riogroup.info/img/logo.png" alt="RioGroupロゴ" className="max-w-[200px] mx-auto" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="size-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">登録リクエストを送信しました</h2>
          <p className="text-sm text-muted-foreground mb-2">
            管理者がアカウントを承認するとご利用いただけます。
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            承認されるまでしばらくお待ちください。<br />
            お急ぎの場合は管理者にご連絡ください。
          </p>
          <Button
            variant="outline"
            onClick={() => setShowPendingMessage(false)}
            className="mt-2"
          >
            ログイン画面に戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="flex justify-center">
            <div className="size-12 rounded-xl bg-[#b71c1c] flex items-center justify-center shadow-md">
              <CreditCard className="size-6 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">名刺管理</CardTitle>
            <CardDescription className="mt-1">
              ビジネスカードをスマートに管理
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">ログイン</TabsTrigger>
              <TabsTrigger value="signup">新規登録</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">メールアドレス</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="mail@example.com"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value)
                      setLoginErrors((prev) => {
                        const { email, ...rest } = prev
                        return rest
                      })
                    }}
                    autoComplete="email"
                    className="h-11"
                  />
                  {loginErrors.email && (
                    <p className="text-sm text-destructive">
                      {loginErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">パスワード</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value)
                      setLoginErrors((prev) => {
                        const { password, ...rest } = prev
                        return rest
                      })
                    }}
                    autoComplete="current-password"
                    className="h-11"
                  />
                  {loginErrors.password && (
                    <p className="text-sm text-destructive">
                      {loginErrors.password}
                    </p>
                  )}
                </div>

                {loginErrors.form && (
                  <p className="text-sm text-destructive text-center">
                    {loginErrors.form}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-[#b71c1c] hover:bg-[#9a1515] text-white"
                  disabled={loginLoading}
                >
                  {loginLoading && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  ログイン
                </Button>
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-display-name">表示名</Label>
                  <Input
                    id="signup-display-name"
                    type="text"
                    placeholder="山田 太郎"
                    value={signupDisplayName}
                    onChange={(e) => {
                      setSignupDisplayName(e.target.value)
                      setSignupErrors((prev) => {
                        const { displayName, ...rest } = prev
                        return rest
                      })
                    }}
                    autoComplete="name"
                    className="h-11"
                  />
                  {signupErrors.displayName && (
                    <p className="text-sm text-destructive">
                      {signupErrors.displayName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">メールアドレス</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="mail@example.com"
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value)
                      setSignupErrors((prev) => {
                        const { email, ...rest } = prev
                        return rest
                      })
                    }}
                    autoComplete="email"
                    className="h-11"
                  />
                  {signupErrors.email && (
                    <p className="text-sm text-destructive">
                      {signupErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">パスワード</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="6文字以上"
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value)
                      setSignupErrors((prev) => {
                        const { password, ...rest } = prev
                        return rest
                      })
                    }}
                    autoComplete="new-password"
                    className="h-11"
                  />
                  {signupErrors.password && (
                    <p className="text-sm text-destructive">
                      {signupErrors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password-confirm">
                    パスワード（確認）
                  </Label>
                  <Input
                    id="signup-password-confirm"
                    type="password"
                    placeholder="もう一度入力"
                    value={signupPasswordConfirm}
                    onChange={(e) => {
                      setSignupPasswordConfirm(e.target.value)
                      setSignupErrors((prev) => {
                        const { passwordConfirm, ...rest } = prev
                        return rest
                      })
                    }}
                    autoComplete="new-password"
                    className="h-11"
                  />
                  {signupErrors.passwordConfirm && (
                    <p className="text-sm text-destructive">
                      {signupErrors.passwordConfirm}
                    </p>
                  )}
                </div>

                {signupErrors.form && (
                  <p className="text-sm text-destructive text-center">
                    {signupErrors.form}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-[#b71c1c] hover:bg-[#9a1515] text-white"
                  disabled={signupLoading}
                >
                  {signupLoading && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  アカウント作成
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
