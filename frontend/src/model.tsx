import { createContext, useContext } from "react"
export type Lang = "EN" | "RU" | "KK"
export type Submission = {
  ownerId?: string
  image?: string
  cover?: string
  about?: string
  createdAt?: string
  visible?: boolean
  year?: string
  eventYears?: string[]
  id: string
  name: string
  description: string
  industry: string
  stage: string
  team: string
  product: string
  status: "Pending" | "Approved" | "Rejected"
  publication: boolean
  consentVersion: string
  consentAt: string
  feedback: string
}
export type EventData = {
  image?: string
  id: string
  title: string
  date: string
  place: string
  published: boolean
}
export type Draft = { image?: string; cover?: string; about?: string; name: string; description: string; industry: string; stage: string; team: string; product: string; processing: boolean; publication: boolean }
export const emptyDraft: Draft = {name:'',description:'',industry:'',stage:'',team:'',product:'',processing:false,publication:false};
export const policies = [
  "Privacy Policy",
  "Terms of Use",
  "Personal Data Processing Consent",
  "Startup Publication Consent",
  "Copyright & IP Policy",
  "Cookie Notice",
]
export const AppContext = createContext({
  liveMode: false,
  userId: null as string | null,
  userEmail: '',
  isAdmin: false,
  authLoading: false,
  recovery: false,
  finishRecovery: () => {},
  workspaceTab: "My applications",
  setWorkspaceTab: (_tab:string)=>{},
  draft: emptyDraft,
  setDraft: (_draft: Draft) => {},
  resubmitId: null as string | null,
  setResubmitId: (_id: string | null) => {},
  registered: false,
  setRegistered: (_value: boolean) => {},
  account: "signed-out" as "signed-out" | "student" | "denied",
  setAccount: (_value: "signed-out" | "student" | "denied") => {},
  lang: "EN" as Lang,
  selected: "SkillPath AI",
  select: (_name: string) => {},
  submissions: [] as Submission[],
  setSubmissions: async (_update: (rows: Submission[]) => Submission[]): Promise<boolean> => true,
  events: [] as EventData[],
  setEvents: async (_update: (rows: EventData[]) => EventData[]): Promise<boolean> => true,
  policy: "",
  openPolicy: (_name: string) => {},
})
export const useModel = () => useContext(AppContext)
export const translations: Record<string, [string, string]> = {}
const plainEnglish: Record<string,string> = {
  Startups: 'Projects', 'My startup': 'My project', Startup: 'Project',
  'Startup name': 'Project name', 'New application': 'Share a project',
  'One-line description': 'A short description', Industry: 'Field',
  'Current stage': 'How far along is your project?',
  EdTech: 'Education', HealthTech: 'Health & medicine', FinTech: 'Finance', SaaS: 'Online services', Climate: 'Environment', FoodTech: 'Food & nutrition', 'HR Tech': 'Work & careers', AgriTech: 'Agriculture',
  Idea: 'Just an idea', Prototype: 'Building a first sample', MVP: 'First working version', Seed: 'Finding funding', Growth: 'Growing the project',
  'Demo Day': 'Project showcase', Rejected: 'Changes requested',
  'Reject application': 'Request project changes', 'Rejection feedback': 'What needs improving?', 'Confirm rejection': 'Send feedback',
}
export function useT() {
  const { lang } = useModel()
  return (text: string) =>
    lang === "EN" ? (plainEnglish[text] ?? text) : (translations[text]?.[lang === "RU" ? 0 : 1] ?? text)
}
