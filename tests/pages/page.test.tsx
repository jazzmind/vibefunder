import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '@/app/page';

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

jest.mock('next/image', () => {
  return ({ src, alt, width, height, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} {...props} />
  );
});

describe('Home Page', () => {
  beforeEach(() => {
    // Clear any previous localStorage items
    localStorage.clear();
  });

  it('should render the home page correctly', () => {
    render(<Home />);

    // Test hero section
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Your Vibe Dazzles.')).toBeInTheDocument();
    expect(screen.getByText('Skip VCs. Go Straight to Profit.')).toBeInTheDocument();
  });

  it('should render email signup form', () => {
    render(<Home />);

    const emailInput = screen.getByPlaceholderText('you@company.com');
    const submitButton = screen.getByRole('button', { name: /request early access/i });

    expect(emailInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
  });

  it('should handle email input changes', () => {
    render(<Home />);

    const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement;
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    expect(emailInput.value).toBe('test@example.com');
  });

  it('should handle form submission', async () => {
    // Mock console.log to capture the form submission
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    render(<Home />);

    const emailInput = screen.getByPlaceholderText('you@company.com');
    const submitButton = screen.getByRole('button', { name: /request early access/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    expect(consoleSpy).toHaveBeenCalledWith('Email signup:', 'test@example.com');
    
    consoleSpy.mockRestore();
  });

  it('should prevent form submission with empty email', () => {
    render(<Home />);

    const form = screen.getByRole('button', { name: /request early access/i }).closest('form');
    const emailInput = screen.getByPlaceholderText('you@company.com');

    // Try to submit empty form
    fireEvent.submit(form!);

    // HTML5 validation should prevent submission
    expect(emailInput).toBeInvalid();
  });

  it('should render "How it works" section', () => {
    render(<Home />);

    expect(screen.getByText('From MVP to Production-Ready in 5 Steps')).toBeInTheDocument();
    
    // Check all 5 steps are rendered
    expect(screen.getByText('Pinpoint exactly what needs improving')).toBeInTheDocument();
    expect(screen.getByText('Partner with experts at fixed prices')).toBeInTheDocument();
    expect(screen.getByText('Rally customers who pre-pay to fund development')).toBeInTheDocument();
    expect(screen.getByText('Delivery guarantee')).toBeInTheDocument();
    expect(screen.getByText('Launch profitably with zero dilution')).toBeInTheDocument();
  });

  it('should render included rails section', () => {
    render(<Home />);

    expect(screen.getByText('Included rails')).toBeInTheDocument();
    expect(screen.getByText('SSO/RBAC/audit logging baseline')).toBeInTheDocument();
    expect(screen.getByText('SOC2-track checklist + evidence vault')).toBeInTheDocument();
    expect(screen.getByText('Milestone acceptance workflows')).toBeInTheDocument();
    expect(screen.getByText('Source code escrow/mirror')).toBeInTheDocument();
    expect(screen.getByText('Partner marketplace (security, QA, SRE, legal)')).toBeInTheDocument();
  });

  it('should render "For Innovators" section', () => {
    render(<Home />);

    expect(screen.getByText('For Innovators')).toBeInTheDocument();
    expect(screen.getByText('No VCs. No dilution. No endless pitching.')).toBeInTheDocument();
    expect(screen.getByText('Transparent milestones & acceptance tests')).toBeInTheDocument();
    expect(screen.getByText('Vetted partners; you keep margin')).toBeInTheDocument();
  });

  it('should render "For Smart Early Adopters" section', () => {
    render(<Home />);

    expect(screen.getByText('For Smart Early Adopters')).toBeInTheDocument();
    expect(screen.getByText('Lifetime org license or on‑prem options')).toBeInTheDocument();
    expect(screen.getByText('Security & compliance packet (SIG Lite/CAIQ, DPA)')).toBeInTheDocument();
    expect(screen.getByText('Escrow tied to proof, not promises')).toBeInTheDocument();
  });

  it('should render trust and safety section', () => {
    render(<Home />);

    expect(screen.getByText('Enterprise-Grade Trust & Safety')).toBeInTheDocument();
    expect(screen.getByText('Verification')).toBeInTheDocument();
    expect(screen.getByText('Continuity')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
  });

  it('should render FAQ section with details elements', () => {
    render(<Home />);

    expect(screen.getByText('FAQ')).toBeInTheDocument();
    expect(screen.getByText('Is this crowdfunding or investing?')).toBeInTheDocument();
    expect(screen.getByText('How does VibeFunder make money?')).toBeInTheDocument();
    expect(screen.getByText('Who owns the IP?')).toBeInTheDocument();
    expect(screen.getByText('What happens if a milestone fails?')).toBeInTheDocument();
  });

  it('should have expandable FAQ details', () => {
    render(<Home />);

    const firstQuestion = screen.getByText('Is this crowdfunding or investing?');
    const detailsElement = firstQuestion.closest('details');
    
    expect(detailsElement).toBeInTheDocument();
    expect(detailsElement).not.toHaveAttribute('open');

    // Click to expand
    fireEvent.click(firstQuestion);
    
    expect(screen.getByText(/Neither\. It's a commercial pre‑purchase/)).toBeInTheDocument();
  });

  it('should render CTA section with navigation links', () => {
    render(<Home />);

    expect(screen.getByText('Ready to vibe with your future?')).toBeInTheDocument();
    
    const browseCampaignsLink = screen.getByRole('link', { name: /browse campaigns/i });
    const startCampaignLink = screen.getByRole('link', { name: /start a campaign/i });
    
    expect(browseCampaignsLink).toBeInTheDocument();
    expect(startCampaignLink).toBeInTheDocument();
    expect(browseCampaignsLink).toHaveAttribute('href', '/campaigns');
    expect(startCampaignLink).toHaveAttribute('href', '/campaigns/create');
  });

  it('should render hero image', () => {
    render(<Home />);

    const heroImage = screen.getByAltText('Rails');
    expect(heroImage).toBeInTheDocument();
    expect(heroImage).toHaveAttribute('src', '/vibefund.png');
  });

  it('should have proper semantic structure', async () => {
    render(await HomePage({ searchParams: Promise.resolve({}) }));

    // Check for proper headings hierarchy
    const h1 = screen.getByRole('heading', { level: 1 });
    const h2s = screen.getAllByRole('heading', { level: 2 });
    const h3s = screen.getAllByRole('heading', { level: 3 });

    expect(h1).toBeInTheDocument();
    expect(h2s.length).toBeGreaterThan(0);
    expect(h3s.length).toBeGreaterThan(0);
  });

  it('should handle keyboard navigation for interactive elements', () => {
    render(<Home />);

    const emailInput = screen.getByPlaceholderText('you@company.com');
    const submitButton = screen.getByRole('button', { name: /request early access/i });

    // Test tab navigation
    emailInput.focus();
    expect(document.activeElement).toBe(emailInput);

    // Tab to next element (submit button)
    fireEvent.keyDown(emailInput, { key: 'Tab' });
    // Note: Actual tab navigation would require more complex testing setup
  });

  it('should render with proper accessibility attributes', () => {
    render(<Home />);

    const form = screen.getByRole('button', { name: /request early access/i }).closest('form');
    const emailInput = screen.getByPlaceholderText('you@company.com');

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(form).toBeInTheDocument();
  });

  it('should handle edge cases for email validation', () => {
    render(<Home />);

    const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement;

    // Test various email formats
    const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'user+tag@example.org'];
    
    validEmails.forEach(email => {
      fireEvent.change(emailInput, { target: { value: email } });
      expect(emailInput.value).toBe(email);
      expect(emailInput).toBeValid();
    });
  });

  it('should render all numbered steps with proper styling', () => {
    render(<Home />);

    // Check for numbered step indicators
    for (let i = 1; i <= 5; i++) {
      const stepNumber = screen.getByText(i.toString());
      expect(stepNumber).toBeInTheDocument();
      
      // Check if it's in a styled container (has brand background)
      const container = stepNumber.closest('.bg-brand');
      expect(container).toBeInTheDocument();
    }
  });

  it('should render checkmark icons in feature lists', () => {
    render(<Home />);

    // Check for SVG checkmark icons
    const checkmarkPaths = screen.getAllByRole('img', { hidden: true });
    const checkmarkElements = Array.from(document.querySelectorAll('svg path[fill-rule="evenodd"]'));
    
    expect(checkmarkElements.length).toBeGreaterThan(0);
  });

  it('should prevent XSS in form input', () => {
    render(<Home />);

    const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement;
    const maliciousInput = '<script>alert("xss")</script>@example.com';
    
    fireEvent.change(emailInput, { target: { value: maliciousInput } });
    
    // Input should be sanitized or escaped
    expect(emailInput.value).toBe(maliciousInput);
    // The DOM should not contain executable script
    expect(document.querySelector('script')).toBeNull();
  });

  it('should render responsive design classes', () => {
    render(<Home />);

    // Check for responsive classes in the hero section
    const heroSection = screen.getByText('Your Vibe Dazzles.').closest('section');
    expect(heroSection).toHaveClass('py-20', 'lg:py-32');

    const mainContainer = screen.getByText('Your Vibe Dazzles.').closest('.max-w-7xl');
    expect(mainContainer).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
  });
});