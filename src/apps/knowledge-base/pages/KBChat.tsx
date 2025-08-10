import React from 'react';

export default function KBChat() {
  React.useEffect(() => {
    document.title = 'Knowledge Base - Chat';
  }, []);

  return (
    <section aria-label="Knowledge Base Chat" className="space-y-4">
      <p className="text-sm text-muted-foreground">Chat with your knowledge bases. The full chat interface will be implemented here.</p>
    </section>
  );
}
