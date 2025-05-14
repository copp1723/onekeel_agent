import { ImapFlow } from 'imapflow';

// Function to test IMAP connection
export const testImapConnection = async (host, port, user, password) => {
  const client = new ImapFlow({
    host,
    port,
    secure: true, // Use secure connection
    auth: {
      user,
      pass: password,
    },
  });

  try {
    await client.connect();
    console.log('IMAP connection successful');
    await client.logout();
    return true;
  } catch (error) {
    console.error('IMAP connection failed:', error);
    return false;
  }
};
