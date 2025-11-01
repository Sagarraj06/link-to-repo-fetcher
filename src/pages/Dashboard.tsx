import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditBadge } from '@/components/CreditBadge';
import { FileText, LogOut, Plus, History, User } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary rounded-lg">
                <FileText className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Government Tender Analysis Platform</h1>
                <p className="text-sm text-muted-foreground">Professional Procurement Intelligence & Reporting</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <CreditBadge />
              <Button variant="outline" size="sm" onClick={handleLogout} className="hover:bg-destructive hover:text-destructive-foreground transition-colors">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-10">
        {/* Welcome Section */}
        <div className="mb-10">
          <h2 className="text-4xl font-bold mb-3 text-foreground">Welcome back, {user.fullName}</h2>
          <p className="text-base text-muted-foreground">
            Generate comprehensive tender analysis reports and gain actionable insights into government procurement data
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Available Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{user.credits}</div>
              <p className="text-sm text-muted-foreground mt-2">
                {user.credits === 0 ? 'No credits remaining - Contact administrator' : `${user.credits} analysis report${user.credits !== 1 ? 's' : ''} available`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Generated Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">0</div>
              <p className="text-sm text-muted-foreground mt-2">
                No reports generated yet
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold capitalize text-foreground">{user.role}</div>
              <p className="text-sm text-muted-foreground mt-2">
                {user.organizationName || 'Individual Account'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-2xl font-bold mb-6 text-foreground">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg hover:border-primary transition-all cursor-pointer border-2" onClick={() => navigate('/generate')}>
              <CardHeader className="pb-4">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-3">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Generate New Report</CardTitle>
                <CardDescription className="text-base">
                  Create a comprehensive tender performance analysis report
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg hover:border-primary transition-all cursor-pointer border-2" onClick={() => navigate('/history')}>
              <CardHeader className="pb-4">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-3">
                  <History className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">View Report History</CardTitle>
                <CardDescription className="text-base">
                  Access and download your previously generated reports
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg hover:border-primary transition-all cursor-pointer border-2" onClick={() => navigate('/profile')}>
              <CardHeader className="pb-4">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-3">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Account Settings</CardTitle>
                <CardDescription className="text-base">
                  Manage your profile and account preferences
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
