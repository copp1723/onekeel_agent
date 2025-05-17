import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Upload } from '@/components/Upload'
import { vi } from 'vitest'

// Mock the useToast hook
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
    showToast: mockToast,
  }),
}))

describe('Upload Component', () => {
  it('renders upload component correctly', () => {
    render(<Upload onUploadSuccess={() => {}} />);

    expect(screen.getByText('Drop your CSV file here')).toBeInTheDocument();
    expect(screen.getByText('Select CSV File')).toBeInTheDocument();
  });

  it('shows error when invalid file type is uploaded', async () => {
    const mockSuccess = vi.fn();

    // Reset the mock before this test
    mockToast.mockReset();

    render(<Upload onUploadSuccess={mockSuccess} allowedTypes={['text/csv']} />);

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Upload Error',
          description: 'Only CSV files are supported',
          variant: 'destructive'
        })
      );
    });
  });
});
