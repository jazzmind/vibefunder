import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageGenerator from '@/components/campaign/ImageGenerator';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock window.location.reload
const mockReload = jest.fn();
delete (window as any).location;
(window as any).location = { reload: mockReload };

describe('ImageGenerator Component', () => {
  const defaultProps = {
    campaignId: 'test-campaign-123',
    onImageGenerated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render component with title', () => {
      render(<ImageGenerator {...defaultProps} />);

      expect(screen.getByText('🎨 AI-Generated Campaign Image')).toBeInTheDocument();
    });

    it('should render generate button without current image', () => {
      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      expect(generateButton).toBeInTheDocument();
      expect(generateButton).not.toBeDisabled();
    });

    it('should render regenerate button with current image', () => {
      render(<ImageGenerator {...defaultProps} currentImage="/test-image.jpg" />);

      const regenerateButton = screen.getByRole('button', { name: /🔄 Regenerate Image/i });
      expect(regenerateButton).toBeInTheDocument();
    });

    it('should display current image when provided', () => {
      render(<ImageGenerator {...defaultProps} currentImage="/test-image.jpg" />);

      const image = screen.getByRole('img', { name: 'Campaign image' });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/test-image.jpg');
    });

    it('should show appropriate description text without current image', () => {
      render(<ImageGenerator {...defaultProps} />);

      expect(screen.getByText(/Generate an AI-powered image that represents your campaign/)).toBeInTheDocument();
    });

    it('should show appropriate description text with current image', () => {
      render(<ImageGenerator {...defaultProps} currentImage="/test-image.jpg" />);

      expect(screen.getByText(/Generate a new AI image for your campaign or keep the current one/)).toBeInTheDocument();
    });

    it('should display replacement warning with current image', () => {
      render(<ImageGenerator {...defaultProps} currentImage="/test-image.jpg" />);

      expect(screen.getByText('Current image will be replaced')).toBeInTheDocument();
    });

    it('should render information bullets', () => {
      render(<ImageGenerator {...defaultProps} />);

      expect(screen.getByText(/Images are generated using AI based on your campaign content/)).toBeInTheDocument();
      expect(screen.getByText(/High-quality 1024x1024 images optimized for your campaign/)).toBeInTheDocument();
      expect(screen.getByText(/Generation typically takes 10-30 seconds/)).toBeInTheDocument();
    });
  });

  describe('image generation flow', () => {
    it('should call API and handle successful generation', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/generated-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      // Should show loading state
      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();
      expect(screen.getByRole('button')).toHaveClass('cursor-not-allowed');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/campaigns/test-campaign-123/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/✅ Image generated successfully/)).toBeInTheDocument();
      });

      // Should call onImageGenerated callback
      expect(defaultProps.onImageGenerated).toHaveBeenCalledWith('/generated-image.jpg');

      // Should display generated image
      await waitFor(() => {
        const image = screen.getByRole('img', { name: 'Campaign image' });
        expect(image).toHaveAttribute('src', '/generated-image.jpg');
      });

      // Should reload page after timeout
      jest.advanceTimersByTime(1500);
      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('should handle API error response', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'Image generation failed'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Image generation failed/)).toBeInTheDocument();
      });

      // Button should be enabled again
      expect(generateButton).not.toBeDisabled();
      expect(defaultProps.onImageGenerated).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Network error/)).toBeInTheDocument();
      });

      expect(generateButton).not.toBeDisabled();
      expect(defaultProps.onImageGenerated).not.toHaveBeenCalled();
    });

    it('should handle API error without error message', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Failed to generate image/)).toBeInTheDocument();
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Failed to generate image/)).toBeInTheDocument();
      });
    });

    it('should clear previous errors when starting new generation', async () => {
      // First request fails
      mockFetch.mockRejectedValueOnce(new Error('First error'));

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ First error/)).toBeInTheDocument();
      });

      // Second request succeeds
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/new-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      fireEvent.click(generateButton);

      // Error should be cleared during loading
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
        expect(screen.queryByText(/❌ First error/)).not.toBeInTheDocument();
      });
    });

    it('should clear previous success messages when starting new generation', async () => {
      // First request succeeds
      const mockResponse1 = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/first-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse1 as any);

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/✅ Image generated successfully/)).toBeInTheDocument();
      });

      // Second request
      const mockResponse2 = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/second-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse2 as any);

      fireEvent.click(screen.getByRole('button', { name: /🔄 Regenerate Image/i }));

      // Success message should be cleared during loading
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
        expect(screen.queryByText(/✅ Image generated successfully/)).not.toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading spinner during generation', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/generated-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();
      
      // Should show loading spinner
      const spinner = screen.getByText('Generating...').previousSibling;
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should disable button during generation', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/generated-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      expect(generateButton).toBeDisabled();
      expect(generateButton).toHaveClass('cursor-not-allowed');
    });

    it('should hide replacement warning during generation', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/generated-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      render(<ImageGenerator {...defaultProps} currentImage="/current-image.jpg" />);

      expect(screen.getByText('Current image will be replaced')).toBeInTheDocument();

      const generateButton = screen.getByRole('button', { name: /🔄 Regenerate Image/i });
      fireEvent.click(generateButton);

      expect(screen.queryByText('Current image will be replaced')).not.toBeInTheDocument();
    });
  });

  describe('callback handling', () => {
    it('should work without onImageGenerated callback', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/generated-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const propsWithoutCallback = {
        campaignId: 'test-campaign-123',
      };

      render(<ImageGenerator {...propsWithoutCallback} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      
      expect(() => fireEvent.click(generateButton)).not.toThrow();

      await waitFor(() => {
        expect(screen.getByText(/✅ Image generated successfully/)).toBeInTheDocument();
      });
    });

    it('should call onImageGenerated with correct path', async () => {
      const mockCallback = jest.fn();
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/specific-generated-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      render(<ImageGenerator {...defaultProps} onImageGenerated={mockCallback} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith('/specific-generated-image.jpg');
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have proper button roles', () => {
      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      expect(generateButton).toBeInTheDocument();
    });

    it('should have proper img alt text', () => {
      render(<ImageGenerator {...defaultProps} currentImage="/test-image.jpg" />);

      const image = screen.getByRole('img', { name: 'Campaign image' });
      expect(image).toHaveAttribute('alt', 'Campaign image');
    });

    it('should support keyboard navigation', () => {
      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      generateButton.focus();
      
      expect(generateButton).toHaveFocus();
    });

    it('should have proper disabled state accessibility', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/generated-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      expect(generateButton).toBeDisabled();
      expect(generateButton).toHaveAttribute('disabled');
    });
  });

  describe('visual feedback', () => {
    it('should show success message with correct styling', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/generated-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        const successMessage = screen.getByText(/✅ Image generated successfully/);
        expect(successMessage).toBeInTheDocument();
        
        const successContainer = successMessage.closest('div');
        expect(successContainer).toHaveClass('bg-green-50', 'dark:bg-green-900/20');
      });
    });

    it('should show error message with correct styling', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/❌ Test error/);
        expect(errorMessage).toBeInTheDocument();
        
        const errorContainer = errorMessage.closest('div');
        expect(errorContainer).toHaveClass('bg-red-50', 'dark:bg-red-900/20');
      });
    });

    it('should apply correct button styling based on state', () => {
      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      expect(generateButton).toHaveClass('bg-brand', 'hover:bg-brand-dark', 'text-white');
    });

    it('should apply disabled button styling during generation', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/generated-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      expect(generateButton).toHaveClass('bg-gray-100', 'dark:bg-gray-700', 'text-gray-400', 'cursor-not-allowed');
    });
  });

  describe('edge cases', () => {
    it('should handle empty campaign ID', async () => {
      render(<ImageGenerator campaignId="" />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/campaigns//generate-image', expect.any(Object));
      });
    });

    it('should handle window being undefined (SSR)', async () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          imagePath: '/generated-image.jpg'
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      render(<ImageGenerator {...defaultProps} />);

      const generateButton = screen.getByRole('button', { name: /✨ Generate Image/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/✅ Image generated successfully/)).toBeInTheDocument();
      });

      jest.advanceTimersByTime(1500);
      
      // Should not throw when window is undefined
      expect(() => jest.runOnlyPendingTimers()).not.toThrow();

      // Restore window
      global.window = originalWindow;
    });
  });
});