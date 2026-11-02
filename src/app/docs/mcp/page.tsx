import { DocsTab, Code } from "@/components/tabs/kit";
import Link from "next/link";
export const metadata = { title: "MCP · Docs" };
export default function Page() {
  return <DocsTab title="MCP"><p>MCP endpoint at <Code>/mcp</Code>. <Link className="underline" href="/mcp">Open</Link>.</p></DocsTab>;
}
