import { AnimatedTabScreen } from '@/components/navigation/animated-tab-screen';
import { AiWorkspaceScreen } from '@/features/ai/ai-workspace-screen';

/** Hidden from the dock — still reachable via deep link / Work. */
export default function AiRoute() {
  return (
    <AnimatedTabScreen tab="ai">
      <AiWorkspaceScreen />
    </AnimatedTabScreen>
  );
}
