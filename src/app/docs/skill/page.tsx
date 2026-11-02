import { DocsTab, Code } from "@/components/tabs/kit";
import Link from "next/link";
export const metadata = { title: "Skill · Docs" };
export default function Page() {
  return <DocsTab title="Skill"><p>Agents read <Code>/skill.md</Code> to learn the tools. <Link className="underline" href="/skill.md">Open skill.md</Link>.</p></DocsTab>;
}
