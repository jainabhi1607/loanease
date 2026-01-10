# Email Templates for Postmark

This directory contains HTML email templates that need to be uploaded to Postmark.

## Setup Instructions

1. Log in to your Postmark account
2. Navigate to "Templates" in your server
3. Click "Add Template"
4. For each template:
   - Set the Template Alias (e.g., `email-verification`)
   - Copy the HTML content from the corresponding `.html` file
   - Paste into Postmark's HTML editor
   - Save the template

## Available Templates

### email-verification.html
- **Alias**: `email-verification`
- **Variables**:
  - `{{first_name}}` - User's first name
  - `{{organization_name}}` - Optional organization name
  - `{{verification_url}}` - Complete verification URL
  - `{{expiry_hours}}` - Hours until link expires (default: 24)
- **Used in**: User registration email verification

## Template Variables

Postmark uses Handlebars syntax for variables:
- Basic variable: `{{variable_name}}`
- Conditional: `{{#if variable}}...{{/if}}`
- Default values should be handled in the application code

## Notes

- All styles must be inline for maximum email client compatibility
- Templates use responsive design with a 600px max width
- Gradient backgrounds may not display in all email clients (fallback colors included)
- Always test templates in Postmark's preview before deploying