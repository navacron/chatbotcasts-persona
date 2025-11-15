import { Suspense } from 'react'
import SignUpForm from '@/components/signup-form'

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen w-full items-center justify-center">Loading...</div>}>
      <SignUpForm />
    </Suspense>
  )
}
