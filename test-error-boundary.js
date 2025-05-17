// Simulated error boundary integration test
import assert from 'assert';

function ErrorBoundary({ children, fallback }) {
  try {
    return children();
  } catch (error) {
    return fallback(error);
  }
}

function testErrorBoundary() {
  // Should render children if no error
  const result1 = ErrorBoundary({
    children: () => 'ok',
    fallback: () => 'error'
  });
  assert.strictEqual(result1, 'ok', 'Should render children if no error');

  // Should render fallback on error
  const result2 = ErrorBoundary({
    children: () => { throw new Error('fail'); },
    fallback: (e) => e.message
  });
  assert.strictEqual(result2, 'fail', 'Should render fallback on error');

  console.log('Error boundary integration test passed.');
}

testErrorBoundary();
