import { Resend } from 'resend';
import cron from 'node-cron';
import fetch from 'node-fetch';

// Initialize Resend lazily to ensure env vars are loaded
let resend;
function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set. Please set your Resend API key in the environment variables.');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Email templates
const emailTemplates = {
  calendar: (userName, events) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">📅 Your Daily Calendar Update</h1>
        <p style="margin: 10px 0 0 0;">Hello ${userName}, here's what's coming up today!</p>
      </div>
      
      <div style="padding: 20px; background: #f8f9fa;">
        <h2 style="color: #333; margin-bottom: 15px;">Today's Events</h2>
        ${events.map(event => `
          <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 5px 0; color: #333;">${event.title}</h3>
            <p style="margin: 0; color: #666;">🕐 ${event.time} | 📍 ${event.type}</p>
          </div>
        `).join('')}
        
        <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
          <p style="margin: 0; color: #1976d2;">💡 Tip: Set reminders for important events to stay on track!</p>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; background: #f5f5f5;">
        <p style="margin: 0; color: #666; font-size: 14px;">
          This email was sent from your Student Hub app. 
          <a href="#" style="color: #667eea;">Manage notifications</a>
        </p>
      </div>
    </div>
  `,

  weather: (userName, weatherData) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">🌤️ Weather Update</h1>
        <p style="margin: 10px 0 0 0;">Hello ${userName}, here's today's weather forecast!</p>
      </div>
      
      <div style="padding: 20px; background: #f8f9fa;">
        <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0 0 10px 0; color: #333;">${weatherData.location}</h2>
          <div style="font-size: 48px; margin: 10px 0;">${weatherData.temperature}°C</div>
          <p style="margin: 0; color: #666; font-size: 18px;">${weatherData.condition}</p>
          <p style="margin: 10px 0 0 0; color: #999;">Feels like ${weatherData.feelsLike}°C</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 20px;">
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px;">💧</div>
            <div style="font-weight: bold; color: #333;">${weatherData.humidity}%</div>
            <div style="font-size: 12px; color: #666;">Humidity</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px;">💨</div>
            <div style="font-weight: bold; color: #333;">${weatherData.windSpeed} km/h</div>
            <div style="font-size: 12px; color: #666;">Wind</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px;">👁️</div>
            <div style="font-weight: bold; color: #333;">${weatherData.visibility} km</div>
            <div style="font-size: 12px; color: #666;">Visibility</div>
          </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; color: #2e7d32;">📚 Study Tip</h3>
          <p style="margin: 0; color: #2e7d32;">${weatherData.suggestion}</p>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; background: #f5f5f5;">
        <p style="margin: 0; color: #666; font-size: 14px;">
          This email was sent from your Student Hub app. 
          <a href="#" style="color: #74b9ff;">Manage notifications</a>
        </p>
      </div>
    </div>
  `,

  budget: (userName, budgetData) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #00b894 0%, #00a085 100%); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">💰 Budget Update</h1>
        <p style="margin: 10px 0 0 0;">Hello ${userName}, here's your budget summary!</p>
      </div>
      
      <div style="padding: 20px; background: #f8f9fa;">
        <div style="background: white; padding: 20px; border-radius: 8px;">
          <h2 style="margin: 0 0 15px 0; color: #333;">Monthly Overview</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #00b894;">₹${budgetData.budget.toLocaleString()}</div>
              <div style="font-size: 12px; color: #666;">Monthly Budget</div>
            </div>
            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #e17055;">₹${budgetData.spent.toLocaleString()}</div>
              <div style="font-size: 12px; color: #666;">Total Spent</div>
            </div>
          </div>
          
          <div style="background: ${budgetData.remaining >= 0 ? '#e8f5e8' : '#ffebee'}; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <div style="font-size: 20px; font-weight: bold; color: ${budgetData.remaining >= 0 ? '#2e7d32' : '#c62828'};">
              ₹${Math.abs(budgetData.remaining).toLocaleString()} ${budgetData.remaining >= 0 ? 'remaining' : 'over budget'}
            </div>
          </div>
          
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #f57c00;">🔥 Discipline Streak</h3>
            <p style="margin: 0; color: #f57c00;">You've maintained budget discipline for ${budgetData.streak} days!</p>
          </div>
        </div>
        
        ${budgetData.recentExpenses.length > 0 ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Recent Expenses</h3>
            ${budgetData.recentExpenses.map(expense => `
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                <div>
                  <div style="font-weight: bold; color: #333;">${expense.description}</div>
                  <div style="font-size: 12px; color: #666;">${expense.category} • ${expense.date}</div>
                </div>
                <div style="font-weight: bold; color: #e17055;">-₹${expense.amount}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      
      <div style="padding: 20px; text-align: center; background: #f5f5f5;">
        <p style="margin: 0; color: #666; font-size: 14px;">
          This email was sent from your Student Hub app. 
          <a href="#" style="color: #00b894;">Manage notifications</a>
        </p>
      </div>
    </div>
  `,

  dailyDigest: (userName, digestData) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">📧 Your Daily Digest</h1>
        <p style="margin: 10px 0 0 0;">Hello ${userName}, here's your personalized daily summary!</p>
        <p style="margin: 5px 0 0 0; font-size: 14px;">${digestData.date}</p>
      </div>
      
      <div style="padding: 20px; background: #f8f9fa;">
        ${digestData.weather ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #333;">🌤️ Today's Weather</h2>
            <div style="text-align: center;">
              <div style="font-size: 36px; margin: 10px 0;">${digestData.weather.temperature}</div>
              <p style="margin: 0; color: #666;">${digestData.weather.condition} in ${digestData.weather.location}</p>
              <p style="margin: 10px 0 0 0; color: #a29bfe; font-style: italic;">${digestData.weather.suggestion}</p>
            </div>
          </div>
        ` : ''}
        
        ${digestData.events && digestData.events.length > 0 ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #333;">📅 Today's Schedule</h2>
            ${digestData.events.map(event => `
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                <div>
                  <div style="font-weight: bold; color: #333;">${event.title}</div>
                  <div style="font-size: 12px; color: #666;">${event.type}</div>
                </div>
                <div style="font-weight: bold; color: #a29bfe;">${event.time}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${digestData.quote ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #333;">💡 Daily Inspiration</h2>
            <div style="text-align: center;">
              <p style="margin: 0; font-style: italic; color: #666; font-size: 16px;">"${digestData.quote.text}"</p>
              <p style="margin: 10px 0 0 0; color: #a29bfe;">— ${digestData.quote.author}</p>
            </div>
          </div>
        ` : ''}
        
        ${digestData.budget ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #333;">💰 Budget Update</h2>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #00b894;">₹${digestData.budget.spent} / ₹${digestData.budget.budget}</div>
              <p style="margin: 10px 0 0 0; color: #666;">₹${digestData.budget.remaining} remaining this month</p>
            </div>
          </div>
        ` : ''}
      </div>
      
      <div style="padding: 20px; text-align: center; background: #f5f5f5;">
        <p style="margin: 0; color: #666; font-size: 14px;">
          This email was sent from your Student Hub app. 
          <a href="#" style="color: #a29bfe;">Manage notifications</a>
        </p>
      </div>
    </div>
  `
};

// Email service functions
export const emailService = {
  // Send calendar notification
  async sendCalendarNotification(userEmail, userName, events) {
    try {
      const htmlContent = emailTemplates.calendar(userName, events);
      
      const resendClient = getResend();
      const result = await resendClient.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: userEmail,
        subject: '📅 Your Daily Calendar Update',
        html: htmlContent
      });
      
      console.log('Calendar notification sent:', result.data?.id);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Error sending calendar notification:', error);
      return { success: false, error: error.message };
    }
  },

  // Send weather notification
  async sendWeatherNotification(userEmail, userName, weatherData) {
    try {
      const htmlContent = emailTemplates.weather(userName, weatherData);
      
      const resendClient = getResend();
      const result = await resendClient.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: userEmail,
        subject: '🌤️ Weather Update',
        html: htmlContent
      });
      
      console.log('Weather notification sent:', result.data?.id);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Error sending weather notification:', error);
      return { success: false, error: error.message };
    }
  },

  // Send budget notification
  async sendBudgetNotification(userEmail, userName, budgetData) {
    try {
      const htmlContent = emailTemplates.budget(userName, budgetData);
      
      const resendClient = getResend();
      const result = await resendClient.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: userEmail,
        subject: '💰 Budget Update',
        html: htmlContent
      });
      
      console.log('Budget notification sent:', result.data?.id);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Error sending budget notification:', error);
      return { success: false, error: error.message };
    }
  },

  // Send daily digest
  async sendDailyDigest(userEmail, userName, digestData) {
    try {
      const htmlContent = emailTemplates.dailyDigest(userName, digestData);
      
      const resendClient = getResend();
      const result = await resendClient.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: userEmail,
        subject: '📧 Your Daily Digest',
        html: htmlContent
      });
      
      console.log('Daily digest sent:', result.data?.id);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Error sending daily digest:', error);
      return { success: false, error: error.message };
    }
  },

  // Schedule daily digest
  scheduleDailyDigest(userEmail, userName, preferredTime = '08:00') {
    const [hour, minute] = preferredTime.split(':');
    
    const cronExpression = `${minute} ${hour} * * *`;
    
    cron.schedule(cronExpression, async () => {
      try {
        // Fetch user data and generate digest
        const digestData = await this.generateDigestData(userEmail);
        await this.sendDailyDigest(userEmail, userName, digestData);
      } catch (error) {
        console.error('Error in scheduled daily digest:', error);
      }
    });
    
    console.log(`Daily digest scheduled for ${userEmail} at ${preferredTime}`);
  },

  // Generate digest data
  async generateDigestData(userEmail) {
    const today = new Date();
    const date = today.toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Fetch weather data
    let weatherData = null;
    try {
      const weatherResponse = await fetch(`http://localhost:4000/weather?city=Mumbai`);
      if (weatherResponse.ok) {
        const weather = await weatherResponse.json();
        weatherData = {
          location: weather.location,
          temperature: `${weather.temperature}°C`,
          condition: weather.condition,
          suggestion: this.getWeatherSuggestion(weather.condition)
        };
      }
    } catch (error) {
      console.log('Weather fetch failed, using mock data');
    }

    // Mock data for other features - in real app, fetch from database
    const digestData = {
      date,
      weather: weatherData || {
        location: 'Mumbai, Maharashtra',
        temperature: '28°C',
        condition: 'Partly Cloudy',
        suggestion: 'Perfect weather for outdoor study! ☀️'
      },
      events: [
        { title: 'Math Exam', time: '10:00 AM', type: 'exam' },
        { title: 'Physics Lab', time: '2:00 PM', type: 'class' },
        { title: 'Study Group', time: '5:00 PM', type: 'personal' }
      ],
      quote: {
        text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        author: "Winston Churchill"
      },
      budget: {
        spent: 1800,
        budget: 5000,
        remaining: 3200
      }
    };

    return digestData;
  },

  // Get weather-based study suggestion
  getWeatherSuggestion(condition) {
    const suggestions = {
      'Clear': 'Perfect weather for outdoor study! ☀️',
      'Sunny': 'Great day for studying outside! ☀️',
      'Clouds': 'Good weather for focused indoor study 📚',
      'Rain': 'Perfect weather for cozy indoor studying ☔',
      'Thunderstorm': 'Stay indoors and focus on your studies ⛈️',
      'Snow': 'Perfect weather for warm indoor studying ❄️',
      'Mist': 'Calm weather ideal for concentration 🌫️'
    };
    return suggestions[condition] || 'Good weather for studying! 📚';
  },

  // Test email configuration
  async testEmailConfig() {
    try {
      const resendClient = getResend();
      const result = await resendClient.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>This is a test email from your Student Hub app.</p>'
      });
      
      console.log('Resend configuration is valid');
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Resend configuration error:', error);
      return { success: false, error: error.message };
    }
  }
};

export default emailService;
