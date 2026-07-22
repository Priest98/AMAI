import PendingRepliesList from './PendingRepliesList';

export default function ApprovalQueuePage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Approval Queue</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Review and approve AI-generated replies to comments from your social channels.
        </p>
      </div>
      
      <PendingRepliesList />
    </div>
  );
}
