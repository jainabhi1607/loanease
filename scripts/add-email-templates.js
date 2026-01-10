const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const emailTemplates = [
  // Welcome Email (sent to new referrer)
  {
    key: 'new_signup_email_subject',
    value: 'Welcome to Loancase - {Entity Name}',
    description: 'Subject for welcome email sent to new referrers'
  },
  {
    key: 'new_signup_email_content',
    value: `<p>Congratulations {Name}!</p>

<p>Your Loancase registration has been a success. In order to access the portal and submit your first opportunity, please use the details below.</p>

<p>Username: {UserName}<br>
Password: {Password}</p>

<p>You can reset your password at any time by going to https://app.cluefinance.com.au/reset-password</p>

<p></p>
<p>Thanks,</p>
<p>The Loancase Team |
   <a href="tel:+611300007878" target="_blank" rel="noopener">+61 1300 00 78 78</a>
</p>
<p>For application status updates please email
   <a href="mailto:apps@cluefinance.com.au" target="_blank" rel="noopener">apps@cluefinance.com.au</a>
</p>
<p>For Referral Partner queries please email
   <a href="mailto:partners@cluefinance.com.au" target="_blank" rel="noopener">partners@cluefinance.com.au</a>
</p>`,
    description: 'Content for welcome email sent to new referrers. Variables: {Name}, {UserName}, {Password}, {Entity Name}'
  },

  // Referrer Agreement Email (sent to new referrer with PDF attachment)
  {
    key: 'referrer_agreement_subject',
    value: 'Loancase - Referrer Agreement - {Entity Name}',
    description: 'Subject for referrer agreement email'
  },
  {
    key: 'referrer_agreement_content',
    value: `<p>Dear {Name}</p>

<p>Welcome to Loancase! We are excited to have you on board and look forward to a successful partnership.</p>

<p>Attached to this email is the agreement outlining the terms and conditions you agreed to while signing up. Please review it for your reference. If you have any questions, feel free to reach out to us.</p>

<p>We appreciate your trust and look forward to working together.</p>

<p>&nbsp;</p>
<p>Thanks,</p>
<p>The Loancase Team |
   <a href="tel:+611300007878" target="_blank" rel="noopener">+61 1300 00 78 78</a>
</p>
<p>For application status updates please email
   <a href="mailto:apps@cluefinance.com.au" target="_blank" rel="noopener">apps@cluefinance.com.au</a>
</p>
<p>For Referral Partner queries please email
   <a href="mailto:partners@cluefinance.com.au" target="_blank" rel="noopener">partners@cluefinance.com.au</a>
</p>`,
    description: 'Content for referrer agreement email with PDF attachment. Variables: {Name}, {Entity Name}'
  },

  // New Broker Alert Email (sent to admin team)
  {
    key: 'new_broker_email_subject',
    value: 'New Referrer Added - {Referrer-Entity-Name}',
    description: 'Subject for new referrer alert email sent to admin team'
  },
  {
    key: 'new_broker_email_content',
    value: `<p>A new Referrer has signed-up to Loancase. Please find the details below:</p>
<ul>
   <li><strong>Company Name: </strong>{Company-Name}</li>
   <li><strong>Director Name: </strong>{Director-Name}</li>
   <li><strong>Contact Phone: </strong>{Contact-Phone}</li>
   <li><strong>Contact Email: </strong>{Contact-Email}</li>
   <li><strong>ABN: </strong>{ABN}</li>
   <li><strong>Trading Name: </strong>{Trading-Name}</li>
   <li><strong>Address: </strong>{Address}</li>
   <li><strong>Industry Type: </strong>{Industry-Type}</li>
</ul>
<p>Best Regards</p>`,
    description: 'Content for new referrer alert email. Variables: {Company-Name}, {Director-Name}, {Contact-Phone}, {Contact-Email}, {ABN}, {Trading-Name}, {Address}, {Industry-Type}, {Referrer-Entity-Name}'
  },

  // New Broker Alert Recipients
  {
    key: 'new_broker_alert',
    value: 'partners@cluefinance.com.au',
    description: 'Email addresses to receive new referrer alerts (one per line)'
  },

  // New User Email (for team members added by referrer admin)
  {
    key: 'new_user_subject',
    value: 'Welcome to Loancase',
    description: 'Subject for welcome email sent to new team members'
  },
  {
    key: 'new_user_content',
    value: `<p>Congratulations {Name}!</p>

<p>Your Loancase registration has been a success. In order to access the portal, please use the details below.</p>

<p>Username: {UserName}<br>
Password: {Password}</p>

<p>You can reset your password at any time by going to https://app.cluefinance.com.au/reset-password</p>

<p>&nbsp;</p>
<p>Thanks,</p>
<p>The Loancase Team |
   <a href="tel:+611300007878" target="_blank" rel="noopener">+61 1300 00 78 78</a>
</p>
<p>For application status updates please email
   <a href="mailto:apps@cluefinance.com.au" target="_blank" rel="noopener">apps@cluefinance.com.au</a>
</p>
<p>For Referral Partner queries please email
   <a href="mailto:partners@cluefinance.com.au" target="_blank" rel="noopener">partners@cluefinance.com.au</a>
</p>`,
    description: 'Content for welcome email sent to new team members. Variables: {Name}, {UserName}, {Password}'
  }
];

async function addEmailTemplates() {
  console.log('Adding email templates to global_settings...\n');

  for (const template of emailTemplates) {
    // Check if key already exists
    const { data: existing } = await supabase
      .from('global_settings')
      .select('id')
      .eq('key', template.key)
      .single();

    if (existing) {
      console.log(`Updating existing: ${template.key}`);
      const { error } = await supabase
        .from('global_settings')
        .update({ value: template.value, description: template.description })
        .eq('key', template.key);

      if (error) {
        console.error(`  Error updating ${template.key}:`, error.message);
      } else {
        console.log(`  Updated successfully`);
      }
    } else {
      console.log(`Inserting new: ${template.key}`);
      const { error } = await supabase
        .from('global_settings')
        .insert(template);

      if (error) {
        console.error(`  Error inserting ${template.key}:`, error.message);
      } else {
        console.log(`  Inserted successfully`);
      }
    }
  }

  console.log('\nDone!');
}

addEmailTemplates();
