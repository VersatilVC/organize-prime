import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import type { ChatMessage } from './ChatMessageService';

export interface ConversationExportOptions {
  format: 'markdown' | 'pdf' | 'json' | 'html' | 'txt';
  includeMetadata: boolean;
  includeSources: boolean;
  includeTimestamps: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  customTitle?: string;
  includeSystemMessages?: boolean;
}

export interface ExportedConversation {
  title: string;
  exportedAt: string;
  messageCount: number;
  format: string;
  messages: Array<{
    type: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    sources?: Array<{
      document_name: string;
      chunk_text: string;
      confidence_score: number;
    }>;
    metadata?: Record<string, any>;
  }>;
  metadata?: {
    conversationId: string;
    organizationId: string;
    participants: string[];
    totalTokens?: number;
    models?: string[];
    knowledgeBases?: string[];
  };
}

export class ConversationExportService {
  /**
   * Export conversation in the specified format
   */
  static async exportConversation(
    messages: ChatMessage[],
    conversationTitle: string,
    options: ConversationExportOptions
  ): Promise<void> {
    // Filter messages based on options
    let filteredMessages = this.filterMessages(messages, options);
    
    // Prepare export data
    const exportData = this.prepareExportData(filteredMessages, conversationTitle, options);
    
    switch (options.format) {
      case 'markdown':
        await this.exportAsMarkdown(exportData, options);
        break;
      case 'pdf':
        await this.exportAsPDF(exportData, options);
        break;
      case 'json':
        await this.exportAsJSON(exportData, options);
        break;
      case 'html':
        await this.exportAsHTML(exportData, options);
        break;
      case 'txt':
        await this.exportAsText(exportData, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Filter messages based on export options
   */
  private static filterMessages(messages: ChatMessage[], options: ConversationExportOptions): ChatMessage[] {
    let filtered = [...messages];

    // Filter by date range
    if (options.dateRange) {
      filtered = filtered.filter(msg => {
        const msgDate = new Date(msg.created_at);
        return msgDate >= options.dateRange!.start && msgDate <= options.dateRange!.end;
      });
    }

    // Filter system messages
    if (!options.includeSystemMessages) {
      filtered = filtered.filter(msg => msg.message_type !== 'system');
    }

    return filtered;
  }

  /**
   * Prepare export data structure
   */
  private static prepareExportData(
    messages: ChatMessage[],
    title: string,
    options: ConversationExportOptions
  ): ExportedConversation {
    const exportedMessages = messages.map(msg => ({
      type: msg.message_type,
      content: msg.content,
      timestamp: msg.created_at,
      ...(options.includeSources && msg.sources?.length > 0 && {
        sources: msg.sources.map(source => ({
          document_name: source.document_name,
          chunk_text: source.chunk_text,
          confidence_score: source.confidence_score
        }))
      }),
      ...(options.includeMetadata && msg.metadata && {
        metadata: msg.metadata
      })
    }));

    return {
      title: options.customTitle || title,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      format: options.format,
      messages: exportedMessages,
      ...(options.includeMetadata && {
        metadata: {
          conversationId: messages[0]?.conversation_id || '',
          organizationId: messages[0]?.organization_id || '',
          participants: ['User', 'AI Assistant'],
          totalTokens: messages.reduce((sum, msg) => sum + (msg.metadata?.tokens_used || 0), 0),
          models: [...new Set(messages.map(msg => msg.metadata?.model).filter(Boolean))],
          knowledgeBases: [] // TODO: Extract KB IDs from conversation
        }
      })
    };
  }

  /**
   * Export as Markdown
   */
  private static async exportAsMarkdown(data: ExportedConversation, options: ConversationExportOptions): Promise<void> {
    let markdown = `# ${data.title}\n\n`;
    
    if (options.includeMetadata) {
      markdown += `**Exported:** ${new Date(data.exportedAt).toLocaleString()}\n`;
      markdown += `**Messages:** ${data.messageCount}\n`;
      if (data.metadata) {
        markdown += `**Models Used:** ${data.metadata.models?.join(', ') || 'N/A'}\n`;
        markdown += `**Total Tokens:** ${data.metadata.totalTokens || 0}\n`;
      }
      markdown += '\n---\n\n';
    }

    data.messages.forEach((msg, index) => {
      const timestamp = options.includeTimestamps 
        ? ` *(${new Date(msg.timestamp).toLocaleString()})*`
        : '';
      
      if (msg.type === 'user') {
        markdown += `## 👤 User${timestamp}\n\n${msg.content}\n\n`;
      } else if (msg.type === 'assistant') {
        markdown += `## 🤖 Assistant${timestamp}\n\n${msg.content}\n\n`;
        
        // Add sources if included
        if (options.includeSources && msg.sources && msg.sources.length > 0) {
          markdown += `### Sources\n\n`;
          msg.sources.forEach((source, i) => {
            markdown += `${i + 1}. **${source.document_name}** (${Math.round(source.confidence_score * 100)}% confidence)\n`;
            markdown += `   > ${source.chunk_text.substring(0, 200)}...\n\n`;
          });
        }
      } else if (msg.type === 'system') {
        markdown += `## ⚙️ System${timestamp}\n\n*${msg.content}*\n\n`;
      }

      if (index < data.messages.length - 1) {
        markdown += '---\n\n';
      }
    });

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${this.sanitizeFilename(data.title)}.md`);
  }

  /**
   * Export as PDF
   */
  private static async exportAsPDF(data: ExportedConversation, options: ConversationExportOptions): Promise<void> {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10): number => {
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, maxWidth);
      lines.forEach((line: string, index: number) => {
        if (y + (index * lineHeight) > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, x, y + (index * lineHeight));
      });
      return y + (lines.length * lineHeight) + 5;
    };

    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    yPosition = addWrappedText(data.title, margin, yPosition, pageWidth - 2 * margin, 18);
    yPosition += 10;

    // Metadata
    if (options.includeMetadata) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      yPosition = addWrappedText(`Exported: ${new Date(data.exportedAt).toLocaleString()}`, margin, yPosition, pageWidth - 2 * margin);
      yPosition = addWrappedText(`Messages: ${data.messageCount}`, margin, yPosition, pageWidth - 2 * margin);
      yPosition += 10;
    }

    // Messages
    data.messages.forEach((msg, index) => {
      // Check if we need a new page
      if (yPosition > pdf.internal.pageSize.getHeight() - 50) {
        pdf.addPage();
        yPosition = margin;
      }

      // Message header
      pdf.setFont('helvetica', 'bold');
      const role = msg.type === 'user' ? '👤 User' : msg.type === 'assistant' ? '🤖 Assistant' : '⚙️ System';
      const timestamp = options.includeTimestamps ? ` (${new Date(msg.timestamp).toLocaleString()})` : '';
      yPosition = addWrappedText(`${role}${timestamp}`, margin, yPosition, pageWidth - 2 * margin, 12);

      // Message content
      pdf.setFont('helvetica', 'normal');
      yPosition = addWrappedText(msg.content, margin, yPosition, pageWidth - 2 * margin);

      // Sources
      if (options.includeSources && msg.sources && msg.sources.length > 0) {
        pdf.setFont('helvetica', 'italic');
        yPosition = addWrappedText('Sources:', margin, yPosition, pageWidth - 2 * margin, 10);
        msg.sources.forEach((source, i) => {
          const sourceText = `${i + 1}. ${source.document_name} (${Math.round(source.confidence_score * 100)}% confidence)`;
          yPosition = addWrappedText(sourceText, margin + 10, yPosition, pageWidth - 2 * margin - 10, 9);
        });
      }

      yPosition += 10;
    });

    pdf.save(`${this.sanitizeFilename(data.title)}.pdf`);
  }

  /**
   * Export as JSON
   */
  private static async exportAsJSON(data: ExportedConversation, options: ConversationExportOptions): Promise<void> {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    saveAs(blob, `${this.sanitizeFilename(data.title)}.json`);
  }

  /**
   * Export as HTML
   */
  private static async exportAsHTML(data: ExportedConversation, options: ConversationExportOptions): Promise<void> {
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .message { margin-bottom: 30px; padding: 20px; border-radius: 8px; }
        .user { background-color: #f3f4f6; }
        .assistant { background-color: #ecfdf5; }
        .system { background-color: #fef3c7; font-style: italic; }
        .message-header { font-weight: bold; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .timestamp { font-size: 0.875rem; color: #6b7280; font-weight: normal; }
        .sources { margin-top: 15px; padding: 10px; background-color: #f9fafb; border-left: 4px solid #d1d5db; }
        .source { margin-bottom: 8px; font-size: 0.875rem; }
        .metadata { background-color: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${data.title}</h1>`;

    if (options.includeMetadata) {
      html += `
        <div class="metadata">
            <p><strong>Exported:</strong> ${new Date(data.exportedAt).toLocaleString()}</p>
            <p><strong>Messages:</strong> ${data.messageCount}</p>`;
      
      if (data.metadata) {
        html += `
            <p><strong>Models Used:</strong> ${data.metadata.models?.join(', ') || 'N/A'}</p>
            <p><strong>Total Tokens:</strong> ${data.metadata.totalTokens || 0}</p>`;
      }
      
      html += `
        </div>`;
    }

    html += `
    </div>
    <div class="messages">`;

    data.messages.forEach(msg => {
      const roleIcon = msg.type === 'user' ? '👤' : msg.type === 'assistant' ? '🤖' : '⚙️';
      const roleText = msg.type.charAt(0).toUpperCase() + msg.type.slice(1);
      const timestamp = options.includeTimestamps 
        ? `<span class="timestamp">${new Date(msg.timestamp).toLocaleString()}</span>`
        : '';

      html += `
        <div class="message ${msg.type}">
            <div class="message-header">
                ${roleIcon} ${roleText} ${timestamp}
            </div>
            <div class="content">
                ${msg.content.replace(/\n/g, '<br>')}
            </div>`;

      if (options.includeSources && msg.sources && msg.sources.length > 0) {
        html += `
            <div class="sources">
                <strong>Sources:</strong>
                ${msg.sources.map((source, i) => 
                  `<div class="source">${i + 1}. <strong>${source.document_name}</strong> (${Math.round(source.confidence_score * 100)}% confidence)<br>
                   <em>${source.chunk_text.substring(0, 200)}...</em></div>`
                ).join('')}
            </div>`;
      }

      html += `
        </div>`;
    });

    html += `
    </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `${this.sanitizeFilename(data.title)}.html`);
  }

  /**
   * Export as Plain Text
   */
  private static async exportAsText(data: ExportedConversation, options: ConversationExportOptions): Promise<void> {
    let text = `${data.title}\n${'='.repeat(data.title.length)}\n\n`;
    
    if (options.includeMetadata) {
      text += `Exported: ${new Date(data.exportedAt).toLocaleString()}\n`;
      text += `Messages: ${data.messageCount}\n`;
      if (data.metadata) {
        text += `Models Used: ${data.metadata.models?.join(', ') || 'N/A'}\n`;
        text += `Total Tokens: ${data.metadata.totalTokens || 0}\n`;
      }
      text += '\n' + '-'.repeat(50) + '\n\n';
    }

    data.messages.forEach((msg, index) => {
      const timestamp = options.includeTimestamps 
        ? ` (${new Date(msg.timestamp).toLocaleString()})`
        : '';
      
      const role = msg.type === 'user' ? 'USER' : msg.type === 'assistant' ? 'ASSISTANT' : 'SYSTEM';
      text += `[${role}]${timestamp}\n${msg.content}\n`;
      
      if (options.includeSources && msg.sources && msg.sources.length > 0) {
        text += '\nSources:\n';
        msg.sources.forEach((source, i) => {
          text += `${i + 1}. ${source.document_name} (${Math.round(source.confidence_score * 100)}% confidence)\n`;
          text += `   ${source.chunk_text.substring(0, 200)}...\n`;
        });
      }

      if (index < data.messages.length - 1) {
        text += '\n' + '-'.repeat(50) + '\n\n';
      }
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${this.sanitizeFilename(data.title)}.txt`);
  }

  /**
   * Sanitize filename for saving
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single
      .toLowerCase()
      .substring(0, 100); // Limit length
  }

  /**
   * Get export size estimate
   */
  static getExportSizeEstimate(messages: ChatMessage[], format: string): string {
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    
    switch (format) {
      case 'json':
        return `~${Math.round(totalChars * 2.5 / 1024)} KB`;
      case 'pdf':
        return `~${Math.round(totalChars * 0.8 / 1024)} KB`;
      case 'html':
        return `~${Math.round(totalChars * 1.8 / 1024)} KB`;
      case 'markdown':
      case 'txt':
        return `~${Math.round(totalChars / 1024)} KB`;
      default:
        return `~${Math.round(totalChars / 1024)} KB`;
    }
  }

  /**
   * Check if export format is supported
   */
  static isSupportedFormat(format: string): boolean {
    return ['markdown', 'pdf', 'json', 'html', 'txt'].includes(format);
  }
}