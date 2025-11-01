import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, BarChart3, TrendingUp, Shield } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-20">
          <div className="flex justify-center mb-8">
            <div className="p-5 bg-primary rounded-2xl shadow-lg">
              <FileText className="h-20 w-20 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-6xl font-bold mb-6 text-foreground">
            Government Tender Analysis Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            Generate comprehensive, professional PDF reports analyzing government tender data with advanced filtering capabilities and AI-powered strategic insights
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/register')} className="text-lg px-10 h-14 font-semibold">
              Get Started - Receive 10 Free Credits
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="text-lg px-10 h-14 font-semibold border-2">
              Sign In to Your Account
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Platform Features & Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card p-8 rounded-lg shadow-md border-2 hover:border-primary transition-colors">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <BarChart3 className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">Comprehensive Analysis</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Detailed insights into bidding history, market overview, department performance metrics, and competitive landscape analysis
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-lg shadow-md border-2 hover:border-primary transition-colors">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <TrendingUp className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">AI-Powered Strategic Insights</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Intelligent recommendations, winnable opportunity identification, and data-driven strategic guidance for procurement success
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-lg shadow-md border-2 hover:border-primary transition-colors">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">Secure & Professional</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Enterprise-grade security with professional PDF reports delivered securely to your designated email address
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
