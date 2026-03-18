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

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading, signIn, signUp } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/")
    }
  }, [authLoading, isAuthenticated, router])

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({})
  const [loginLoading, setLoginLoading] = useState(false)

  // Signup form state
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
      await signUp(signupEmail, signupPassword)
      toast.success("アカウントを作成しました")
      router.push("/")
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="flex justify-center">
            <div className="size-12 rounded-xl bg-[#00bd5d] flex items-center justify-center shadow-md">
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
                  className="w-full bg-[#00bd5d] hover:bg-[#00a550] text-white"
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
                  className="w-full bg-[#00bd5d] hover:bg-[#00a550] text-white"
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
