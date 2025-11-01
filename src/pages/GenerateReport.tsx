import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditBadge } from '@/components/CreditBadge';
import { ArrowLeft, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generatePDF } from '@/utils/pdfGenerator';

const DEPARTMENTS = [
  "Department Of Defence",
  "Department Of Military Affairs",
  "Department Of Defence Production",
  "Department Of Defence Research & Development",
  "Central Armed Police Forces",
  "Indian Railways",
  "Department Of Atomic Energy",
  "Department Of Heavy Industry",
  "Coal India Limited",
  "Steel Authority Of India Limited",
];

const FILTER_SECTIONS = [
  { id: 'bidsSummary', label: 'Summary of Bids Participated (Department-wise)', default: true },
  { id: 'marketOverview', label: 'Overall Market Overview', default: true },
  { id: 'topPerformer', label: 'Top Performer Department', default: true },
  { id: 'missedTenders', label: 'Missed-but-Winnable Tenders', default: true },
  { id: 'buyerInsights', label: 'Buyer/Department Insights', default: true },
  { id: 'rivalryScore', label: 'Rivalry Scorecard', default: true },
  { id: 'lowCompetition', label: 'Single-Bidder/Low-Competition Opportunities', default: true },
  { id: 'categoryAnalysis', label: 'Category Distribution Analysis', default: true },
  { id: 'statesAnalysis', label: 'Top Performing States/Geographies', default: true },
  { id: 'departmentsAnalysis', label: 'Top Departments by Tender Volume', default: true },
];

const GenerateReport = () => {
  const { user, updateCredits } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [formData, setFormData] = useState({
    sellerName: '',
    department: '',
    offeredItem: '',
    days: 60,
    limit: 10,
    email: user?.email || '',
  });

  const [selectedFilters, setSelectedFilters] = useState<string[]>(
    FILTER_SECTIONS.filter(f => f.default).map(f => f.id)
  );

  const handleFilterToggle = (filterId: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const handleSelectAll = () => {
    setSelectedFilters(FILTER_SECTIONS.map(f => f.id));
  };

  const handleDeselectAll = () => {
    setSelectedFilters([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (user.credits < 1) {
      toast({
        title: "Insufficient Credits",
        description: `You need 1 credit to generate a report. Current balance: ${user.credits}`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const requestPayload = {
        ...formData,
        filters: {
          includeSections: selectedFilters,
        },
        userId: user.email,
      };

      console.log('Sending report generation request:', requestPayload);

      let response;
      try {
        // Use direct connection in localhost, proxy in production
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        let apiUrl;
        if (isLocalhost) {
          // Direct connection for local development
          apiUrl = 'http://161.118.181.8/api/pdf';
          console.log('Using direct API connection (localhost)');
        } else {
          // Use proxy for production (HTTPS)
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          apiUrl = `${supabaseUrl}/functions/v1/proxy-pdf`;
          console.log('Using proxy API connection (production)');
        }
        
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });
      } catch (fetchError: any) {
        console.error('Network connection error:', fetchError);
        
        // Detect mixed content or CORS issues
        if (fetchError.message?.includes('Failed to fetch') || fetchError.name === 'TypeError') {
          toast({
            title: "Connection Failed",
            description: "Unable to connect to the API server. This error occurs because:\n\n• The app runs on HTTPS but the API uses HTTP (Mixed Content)\n• Browser security blocks this connection\n\nSolution: The backend API must use HTTPS, or deploy a proxy server.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Network Error",
            description: `Cannot reach server: ${fetchError.message}. Please check your internet connection.`,
            variant: "destructive",
          });
        }
        return;
      }

      // Handle HTTP error responses
      if (!response.ok) {
        let errorMessage = `Server error (Status ${response.status})`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage;
          console.error('API error response:', errorData);
        } catch {
          // If JSON parsing fails, try text
          try {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText;
          } catch {
            // Use default error message
          }
        }

        toast({
          title: `API Error (${response.status})`,
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Parse JSON response
      let reportData;
      try {
        reportData = await response.json();
        console.log('Report data received successfully:', reportData);
      } catch (parseError: any) {
        console.error('Failed to parse server response:', parseError);
        toast({
          title: "Invalid Response Format",
          description: "The server returned data in an unexpected format. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      // Validate report data
      if (!reportData || typeof reportData !== 'object') {
        console.error('Invalid report data structure:', reportData);
        toast({
          title: "Invalid Data",
          description: "The server returned incomplete data. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Generate PDF
      let pdfDoc;
      try {
        pdfDoc = await generatePDF(reportData, {
          includeSections: selectedFilters,
        });
      } catch (pdfError: any) {
        console.error('PDF generation failed:', pdfError);
        toast({
          title: "PDF Generation Failed",
          description: `Unable to create PDF document: ${pdfError.message}`,
          variant: "destructive",
        });
        return;
      }

      // Download PDF
      try {
        const fileName = `${formData.sellerName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        pdfDoc.save(fileName);

        // Deduct credit only after successful PDF generation
        updateCredits(user.credits - 1);

        toast({
          title: "Report Generated Successfully!",
          description: `Your report has been downloaded as ${fileName}`,
        });

        // Navigate to dashboard after brief delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } catch (downloadError: any) {
        console.error('Failed to download PDF:', downloadError);
        toast({
          title: "Download Failed",
          description: "PDF was generated but download failed. Please try again.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Unexpected error during report generation:', error);
      toast({
        title: "Unexpected Error",
        description: error.message || "An unexpected error occurred. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isFormValid = formData.sellerName && formData.department && formData.offeredItem && formData.email;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="hover:bg-muted">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary rounded-lg">
                  <FileText className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Generate Analysis Report</h1>
                  <p className="text-sm text-muted-foreground">Government Tender Performance Analysis</p>
                </div>
              </div>
            </div>
            <CreditBadge />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <form onSubmit={handleSubmit}>
          <Card className="mb-6 border-2">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-2xl">Report Configuration</CardTitle>
              <CardDescription className="text-base">
                Enter the required information to generate your comprehensive tender analysis report (1 Credit per report)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Seller Name */}
              <div className="space-y-2">
                <Label htmlFor="sellerName" className="text-base font-semibold">Seller/Company Name *</Label>
                <Input
                  id="sellerName"
                  placeholder="Enter company name (e.g., RAJHANS IMPEX)"
                  value={formData.sellerName}
                  onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                  className="h-11"
                  required
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department" className="text-base font-semibold">Target Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select government department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Offered Item */}
              <div className="space-y-2">
                <Label htmlFor="offeredItem" className="text-base font-semibold">Offered Item Categories *</Label>
                <Textarea
                  id="offeredItem"
                  placeholder="Enter item categories separated by commas (e.g., FUSE 6 23X32 MM 6 3A SLOW BLOW, HALOGEN BULB, VENT COVER)"
                  value={formData.offeredItem}
                  onChange={(e) => setFormData({ ...formData, offeredItem: e.target.value })}
                  rows={4}
                  maxLength={500}
                  className="resize-none"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  {formData.offeredItem.length}/500 characters used
                </p>
              </div>

              {/* Days and Limit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="days" className="text-base font-semibold">Analysis Time Period (Days) *</Label>
                  <Input
                    id="days"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.days}
                    onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
                    className="h-11"
                    required
                  />
                  <p className="text-sm text-muted-foreground">Number of days to analyze (1-365)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit" className="text-base font-semibold">Maximum Results *</Label>
                  <Input
                    id="limit"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.limit}
                    onChange={(e) => setFormData({ ...formData, limit: parseInt(e.target.value) })}
                    className="h-11"
                    required
                  />
                  <p className="text-sm text-muted-foreground">Number of results to include (1-100)</p>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">Report Delivery Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-11"
                  required
                />
                <p className="text-sm text-muted-foreground">The generated report will be sent to this email address</p>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Filters */}
          <Card className="mb-6 border-2">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowFilters(!showFilters)}>
                <div>
                  <CardTitle className="text-2xl">Report Sections Configuration</CardTitle>
                  <CardDescription className="text-base">
                    Customize which sections to include in your analysis report ({selectedFilters.length} of {FILTER_SECTIONS.length} sections selected)
                  </CardDescription>
                </div>
                {showFilters ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </CardHeader>
            {showFilters && (
              <CardContent className="space-y-4 p-6">
                <div className="flex gap-3 mb-4">
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectAll} className="font-medium">
                    Select All Sections
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleDeselectAll} className="font-medium">
                    Deselect All Sections
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {FILTER_SECTIONS.map((filter) => (
                    <div key={filter.id} className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={filter.id}
                        checked={selectedFilters.includes(filter.id)}
                        onCheckedChange={() => handleFilterToggle(filter.id)}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor={filter.id}
                        className="text-sm font-medium cursor-pointer leading-relaxed"
                      >
                        {filter.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Submit Button */}
          <Card className="border-2 bg-muted/30">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-base font-semibold">
                    Report Generation Cost: 1 Credit
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your current credit balance: <span className="font-semibold text-foreground">{user?.credits || 0} credits</span>
                  </p>
                  {user && user.credits < 1 && (
                    <p className="text-sm text-destructive font-medium mt-2">
                      Insufficient credits available. Please contact your administrator to purchase additional credits.
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={!isFormValid || isGenerating || !user || user.credits < 1}
                  className="min-w-[200px] h-12 text-base font-semibold"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 mr-2" />
                      Generate Analysis Report
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
};

export default GenerateReport;
