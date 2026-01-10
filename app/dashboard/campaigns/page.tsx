import { Suspense } from "react"
import { CampaignsContent } from "@/components/dashboard/campaigns-content"

export default function CampaignsPage() {
  return (
    <Suspense fallback={null}>
      <CampaignsContent />
    </Suspense>
  )
}
