import { PageHead } from "@/components/shell/page-head";
import { TalkClient } from "@/components/talk/talk-client";
export const metadata = { title: "Talk" };
export default function TalkPage() {
  return (<>
    <PageHead kicker="TALK · RAKAZA" title="Talk" purpose="LLM chat with Rakaza. Ask me anything — no financial advice." />
    <TalkClient />
  </>);
}
