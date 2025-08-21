// Simple test script to verify our chat system works
import { SimpleChatService } from './services/SimpleChatService';

async function testSimpleChat() {
  try {
    console.log('🧪 Testing SimpleChatService...');
    
    // Create a test conversation
    const conversationId = await SimpleChatService.createConversation('Test Chat - Simple');
    console.log('✅ Created conversation:', conversationId);
    
    // Send a test message
    await SimpleChatService.sendMessage(conversationId, 'Hello, this is a test message');
    console.log('✅ Sent test message');
    
    // Wait a bit and check messages
    setTimeout(async () => {
      const messages = await SimpleChatService.getMessages(conversationId);
      console.log('📬 Messages:', messages);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Uncomment to run test
// testSimpleChat();