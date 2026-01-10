import { Suspense } from "react"
import { ClaimsContent } from "@/components/dashboard/claims-content"

export default function ClaimsPage() {
  return (
    <Suspense fallback={null}>
      <ClaimsContent />
    </Suspense>
  )
}
