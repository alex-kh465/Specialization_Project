
import React from 'react';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Payments: React.FC = () => {
  const features = {
    free: [
      '10 AI chat messages per day',
      'Basic calendar integration',
      'Weather updates',
      'Daily digest email',
      'Basic budget tracking'
    ],
    pro: [
      'Unlimited AI chat messages',
      'Advanced calendar features',
      'Email summarization',
      'Priority support',
      'Advanced budget analytics',
      'Custom reminders',
      'Export features',
      'No ads'
    ]
  };

  const testimonials = [
    {
      name: "Priya S.",
      college: "IIT Delhi",
      text: "StudyAI helped me organize my semester so much better. The AI chat is like having a personal tutor!",
      rating: 5
    },
    {
      name: "Rahul M.",
      college: "BITS Pilani",
      text: "The budget planner is a game-changer for students. I saved ₹3000 last month!",
      rating: 5
    },
    {
      name: "Ananya K.",
      college: "DU",
      text: "Email summarizer saves me hours every week. Worth every rupee!",
      rating: 5
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
          Upgrade to StudyAI Pro
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Unlock advanced features and take your academic productivity to the next level
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card className="p-6 border-2 border-gray-200">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold text-gray-900">Free Plan</h3>
            <div className="space-y-2">
              <span className="text-4xl font-bold text-gray-900">₹0</span>
              <p className="text-gray-600">Forever free</p>
            </div>
            
            <Button variant="outline" className="w-full" disabled>
              Current Plan
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {features.free.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Pro Plan */}
        <Card className="p-6 border-2 border-purple-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-500 to-pink-500 text-white px-4 py-1 text-sm font-medium">
            Most Popular
          </div>
          
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Crown className="w-6 h-6 text-purple-500" />
              <h3 className="text-2xl font-bold text-gray-900">Pro Plan</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-4xl font-bold text-gray-900">₹99</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-sm text-gray-600 line-through">₹199/month</p>
              <p className="text-green-600 font-medium">50% off for students!</p>
            </div>
            
            <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Zap className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {features.pro.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Secure Payment Methods</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center justify-center p-3 border border-gray-200 rounded-lg">
            <span className="text-sm font-medium text-purple-600">UPI</span>
          </div>
          <div className="flex items-center justify-center p-3 border border-gray-200 rounded-lg">
            <span className="text-sm font-medium text-blue-600">Debit Card</span>
          </div>
          <div className="flex items-center justify-center p-3 border border-gray-200 rounded-lg">
            <span className="text-sm font-medium text-green-600">Net Banking</span>
          </div>
          <div className="flex items-center justify-center p-3 border border-gray-200 rounded-lg">
            <span className="text-sm font-medium text-orange-600">Wallet</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Powered by Razorpay • 256-bit SSL Encrypted
        </p>
      </div>

      {/* Testimonials */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900 text-center">
          What Students Are Saying
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-gray-700 italic">"{testimonial.text}"</p>
                
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.college}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900">Can I cancel anytime?</h4>
            <p className="text-gray-600 text-sm">Yes, you can cancel your subscription anytime. No questions asked.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Is there a student discount?</h4>
            <p className="text-gray-600 text-sm">Yes! We offer 50% off for verified students. The current price already includes this discount.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">What if I need help?</h4>
            <p className="text-gray-600 text-sm">Pro users get priority support via email and chat. We typically respond within 2 hours.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;
