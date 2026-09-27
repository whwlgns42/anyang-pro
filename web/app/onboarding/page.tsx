import { requireSession } from "../_lib/session-guard";
import { OnboardingForm } from "./onboarding-form";

// anyang-frontend-screens 2절. 프로필 유무는 이 화면이 만드는 대상이라 requireProfile은 쓰지 않는다.
export default async function OnboardingPage() {
  await requireSession();
  return <OnboardingForm />;
}
