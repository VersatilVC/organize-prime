import React from 'react';

export default function KBAnalytics() {
  React.useEffect(() => {
    document.title = 'Knowledge Base - Analytics';
  }, []);

  return (
    <section aria-label="Knowledge Base Analytics" className="space-y-4">
      <p className="text-sm text-muted-foreground">Usage analytics and trends for your organization.</p>
    </section>
  );
}
