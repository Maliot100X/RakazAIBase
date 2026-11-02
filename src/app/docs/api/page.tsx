import { DocsTab, Code } from "@/components/tabs/kit";
import Link from "next/link";
export const metadata = { title: "API · Docs" };
export default function Page() {
  return <DocsTab title="API"><p>Public REST under <Code>/api/v1</Code>; spec at <Code>/openapi.json</Code>. <Link className="underline" href="/openapi.json">Open spec</Link>.</p></DocsTab>;
}
