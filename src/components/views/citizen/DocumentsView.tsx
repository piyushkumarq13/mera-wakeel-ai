import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../../../types';
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Maximize2,
  Hand,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  Crop,
  RotateCw,
  Camera,
  Sparkles,
  ShieldCheck,
  FileUp,
  Trash2,
} from 'lucide-react';
import { sendGeminiChatMessage, fileToBase64, FileData } from '../../../lib/geminiApi';
import {
  fetchUserCases,
  fetchCaseDocuments,
  uploadCaseDocument,
  updateCaseDocumentAnalysis,
  inferDocumentType,
  createCase,
  deleteCaseDocument,
} from '../../../lib/supabase';

interface DocumentsViewProps {
  language: Language;
  currentUser?: { userId: string; email: string; role: string; name?: string } | null;
  activeCaseId?: string | null;
  onBackToHome: () => void;
}

interface UploadedDoc {
  id: string;
  name: string;
  uploadDate: string;
  status: 'Verified' | 'Under Review' | 'Pending' | 'False / Invalid';
  fileData?: FileData;
  rejectionReason?: string;
  customAnalysis?: {
    stampValue?: string;
    executionDate?: string;
    partiesInvolved?: string;
    docType?: string;
    overallStatus?: string;
    usedFor?: string;
    whereUsed?: string;
    authorityGranted?: string;
  };
}

function getDocumentUsageInfo(docType: string) {
  const dt = (docType || '').toLowerCase();

  // Identity Documents
  if (dt.includes('pan') || dt.includes('permanent account number')) {
    return {
      usedFor: 'Mandatory for all financial transactions, income tax filing, opening bank accounts, buying property, and obtaining financial services in India.',
      whereUsed: 'Income Tax Department, Banks, NBFCs, Mutual Fund KYC, Property Registration, TDS filing, and all major financial institutions.',
      authorityGranted: 'Grants a unique 10-digit alphanumeric identity for tax purposes. Mandatory under Income Tax Act 1961 Section 139A. Required for transactions above ₹50,000.',
    };
  } else if (dt.includes('aadhaar') || dt.includes('aadhar') || dt.includes('uid')) {
    return {
      usedFor: 'Biometric-based proof of identity and address for government services, subsidies, banking, mobile SIM, and e-KYC verification.',
      whereUsed: 'Government departments, banks, insurance companies, UIDAI-linked services, and anywhere KYC or identity verification is needed.',
      authorityGranted: 'Unique 12-digit government-issued ID under Aadhaar Act 2016. Accepted as identity and address proof across India. Enables Aadhaar-based e-Sign and DBT subsidy transfers.',
    };
  } else if (dt.includes('voter') || dt.includes('epic') || dt.includes('election')) {
    return {
      usedFor: 'Proof of identity and address for voting in elections, and as a general ID proof for official purposes.',
      whereUsed: 'Election Booths, Government offices, Banks, and as identity proof where Aadhaar is not required.',
      authorityGranted: 'Grants the right to vote under Representation of People Act 1951. Accepted as valid photo ID and address proof across India.',
    };
  } else if (dt.includes('passport')) {
    return {
      usedFor: 'International travel document and the highest-tier identity and address proof in India.',
      whereUsed: 'International borders, Embassies/Consulates, Banks, and for any high-value identity verification process.',
      authorityGranted: 'Granted under Passport Act 1967. Proof of Indian citizenship. Accepted globally as identity proof. Mandatory for international travel.',
    };
  } else if (dt.includes('driving') || dt.includes('licence') || dt.includes('license')) {
    return {
      usedFor: 'Authorization to drive motor vehicles in India and as photo identity and address proof.',
      whereUsed: 'Traffic Police, Motor Vehicle Department (RTO), Banks, and as a general ID proof.',
      authorityGranted: 'Issued under Motor Vehicles Act 1988. Legal authorization to drive specified vehicle categories. Valid photo ID and address proof.',
    };
  // Property Documents
  } else if (dt.includes('sale deed') || dt.includes('registry') || dt.includes('registry patra')) {
    return {
      usedFor: 'Proves absolute ownership and transfer of title of immovable property from vendor to purchaser.',
      whereUsed: 'Sub-Registrar Office (Tehsil/District Registrar), Municipal Corporation, and Revenue Department for mutation (Dakhil-Kharij).',
      authorityGranted: 'Grants lawful ownership rights, title possession, and right to sell, mortgage, or lease the property.',
    };
  } else if (dt.includes('lease') || dt.includes('rent agreement') || dt.includes('kiraya')) {
    return {
      usedFor: 'Establishes lawful tenancy terms, monthly rent, security deposit, and conditions of property occupation.',
      whereUsed: 'Police Verification, District Rent Authority, and Civil Courts for tenant-landlord disputes.',
      authorityGranted: 'Grants temporary possessory rights to occupy and use the premises for residential or commercial purposes.',
    };
  } else if (dt.includes('will') || dt.includes('wasiyat')) {
    return {
      usedFor: 'Disposes of a testator\'s property and assets after death according to their final legal wish.',
      whereUsed: 'District Court for Probate proceedings and Revenue authorities for property name transfer (Succession/Mutation).',
      authorityGranted: 'Grants legal bequest and inheritance rights to designated legal heirs and beneficiaries.',
    };
  } else if (dt.includes('khatauni') || dt.includes('land record') || dt.includes('jamabandi')) {
    return {
      usedFor: 'Records agricultural land ownership, cultivator details, survey numbers, and land area.',
      whereUsed: 'Tehsildar Office, Lekhpal, and Civil/Revenue Courts in land boundary or partition disputes.',
      authorityGranted: 'Official evidentiary standing of agricultural land possession and ownership under Land Revenue Act.',
    };
  } else if (dt.includes('fir') || dt.includes('police') || dt.includes('complaint')) {
    return {
      usedFor: 'Registers a cognizable criminal offense with law enforcement for criminal investigation.',
      whereUsed: 'Police Station, Magistrate Court, and Sessions Court during criminal trial or bail applications.',
      authorityGranted: 'Authorizes police investigation and sets criminal judicial proceedings into motion under CrPC/BNSS.',
    };
  } else if (dt.includes('notice') || dt.includes('legal notice')) {
    return {
      usedFor: 'Formally demands fulfillment of legal obligations, dues settlement, or grievance redressal before court action.',
      whereUsed: 'Before filing a civil suit in Civil Court, Consumer Forum, or Labour Tribunal.',
      authorityGranted: 'Statutory prerequisite notice granting the opposing party an opportunity to rectify breach within stipulated time.',
    };
  } else {
    return {
      usedFor: 'Official legal record for verification, contractual compliance, and dispute resolution.',
      whereUsed: 'Relevant judicial, quasi-judicial, or administrative authority in India.',
      authorityGranted: 'Confers legal evidentiary value and statutory standing for the specified legal purpose.',
    };
  }
}


export const DocumentsView: React.FC<DocumentsViewProps> = ({
  language,
  currentUser,
  activeCaseId,
  onBackToHome,
}) => {
  const [docsList, setDocsList] = useState<UploadedDoc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState<boolean>(false);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load documents from vault storage on mount & sync with localStorage
  useEffect(() => {
    let isMounted = true;
    async function loadDbDocuments() {
      const targetUserId = currentUser?.userId || 'guest_citizen';
      try {
        const cases = await fetchUserCases(targetUserId);
        let allDocs: any[] = [];
        for (const c of cases) {
          const docs = await fetchCaseDocuments(c.id);
          if (docs && docs.length > 0) {
            allDocs = [...allDocs, ...docs];
          }
        }

        if (activeCaseId) {
          const activeDocs = await fetchCaseDocuments(activeCaseId);
          if (activeDocs && activeDocs.length > 0) {
            for (const ad of activeDocs) {
              if (!allDocs.some((d) => d.id === ad.id)) {
                allDocs.push(ad);
              }
            }
          }
        }

        // Load local saved docs from localStorage
        const userDocsKey = `mw_user_uploaded_docs_${currentUser?.userId || 'guest'}`;
        let localSavedDocs: UploadedDoc[] = [];
        try {
          const raw = localStorage.getItem(userDocsKey);
          if (raw) localSavedDocs = JSON.parse(raw);
        } catch (e) {}

        if (isMounted) {
          const mappedFromDb: UploadedDoc[] = allDocs.map((d: any) => {
            const dt = d.document_type || 'Legal Document';
            const usage = getDocumentUsageInfo(dt);
            const isInvalid = d.is_verified_valid === false;
            return {
              id: d.id,
              name: d.file_url ? d.file_url.split('/').pop() || 'Legal Document' : 'Legal Document',
              uploadDate: new Date(d.uploaded_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
              status: isInvalid ? 'False / Invalid' : 'Verified',
              rejectionReason: isInvalid ? (d.ai_analysis || 'Blacklisted non-legal document.') : undefined,
              customAnalysis: {
                stampValue: `Type: ${dt}`,
                executionDate: new Date(d.uploaded_at || Date.now()).toLocaleDateString(),
                partiesInvolved: 'Verified & Encrypted',
                docType: dt,
                overallStatus: d.ai_analysis || 'Document verified & stored securely in private vault.',
                usedFor: usage.usedFor,
                whereUsed: usage.whereUsed,
                authorityGranted: usage.authorityGranted,
              },
            };
          });

          // Combine DB docs with localSavedDocs avoiding duplicate IDs
          const combinedDocs: UploadedDoc[] = [...localSavedDocs];
          for (const dbDoc of mappedFromDb) {
            const existingIdx = combinedDocs.findIndex((cd) => cd.id === dbDoc.id);
            if (existingIdx >= 0) {
              // Merge dbDoc details into combinedDocs keeping any fileData
              combinedDocs[existingIdx] = {
                ...dbDoc,
                fileData: combinedDocs[existingIdx].fileData || dbDoc.fileData,
              };
            } else {
              combinedDocs.push(dbDoc);
            }
          }

          if (combinedDocs.length > 0) {
            setDocsList((prevList) => {
              // Preserve existing fileData in state if present
              const mergedWithState = combinedDocs.map((cd) => {
                const prev = prevList.find((p) => p.id === cd.id);
                if (prev?.fileData && !cd.fileData) {
                  return { ...cd, fileData: prev.fileData };
                }
                return cd;
              });
              return mergedWithState;
            });

            setSelectedDocId((curr) => {
              if (curr && combinedDocs.some((d) => d.id === curr)) return curr;
              return combinedDocs[0].id;
            });
          }
        }
      } catch (err) {
        console.warn('Failed to load database documents:', err);
      }
    }
    loadDbDocuments();
    return () => {
      isMounted = false;
    };
  }, [currentUser, activeCaseId]);

  const currentDoc = docsList.find((d) => d.id === selectedDocId) || docsList[0];

  const handleFileSelect = async (file: File) => {
    if (!file || isAnalyzing || isUploading) return;
    setIsUploading(true);
    setUploadErrorMsg(null);
    try {
      const base64 = await fileToBase64(file);
      const tempDocId = `doc-${Date.now()}`;

      const newDoc: UploadedDoc = {
        id: tempDocId,
        name: file.name,
        uploadDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'Under Review',
        fileData: base64,
      };

      setDocsList((prev) => [newDoc, ...prev]);
      setSelectedDocId(tempDocId);

      // Start Database Upload & Case Resolution asynchronously in parallel
      const dbUploadPromise = (async () => {
        try {
          let targetCaseId = activeCaseId;
          if (!targetCaseId && currentUser?.userId) {
            const userCases = await fetchUserCases(currentUser.userId);
            if (userCases && userCases.length > 0) {
              targetCaseId = userCases[0].id;
            } else {
              try {
                const newC = await createCase(currentUser.userId, 'Document Verification Case', 'other');
                targetCaseId = newC.id;
              } catch (createErr: any) {
                if (createErr?.message === 'ACTIVE_CASE_LIMIT_REACHED') {
                  console.warn('Cannot create case for document: active case limit reached');
                }
              }
            }
          }
          if (!targetCaseId) {
            targetCaseId = `case_${Date.now()}`;
          }
          const dbDoc = await uploadCaseDocument(targetCaseId, file, currentUser?.userId || 'guest_citizen');
          return { targetCaseId, dbDocId: dbDoc?.id || tempDocId };
        } catch (e) {
          console.warn('Background DB upload warning:', e);
          return { targetCaseId: activeCaseId || `case_${Date.now()}`, dbDocId: tempDocId };
        }
      })();

      // Trigger AI Document Verification & OCR Analysis IMMEDIATELY
      setIsAnalyzing(true);
      try {
        const prompt = `You are an AI Indian Legal Document Verifier for Mera Wakeel AI.
Examine this document or image carefully using your vision OCR.

STEP 1: Determine if this is a genuine Indian legal or official document.
Accepted: Sale Deed, Gift Deed, Stamp Paper, Registry, Khatauni, Will, FIR, Court Notice, Lease Agreement, Legal Notice, Power of Attorney, Aadhaar Card, PAN Card, Voter ID, Passport, Driving Licence, Affidavit, Employment Contract, Cheque, Salary Slip, Birth Certificate, Marriage Certificate, Death Certificate, any government-issued document.

Rejected (NOT legal documents): Train Ticket, Bus Ticket, Flight Ticket, Movie Ticket, Personal Receipt, Photo of animal/food/person/landscape/meme, Screenshot, Blank image.

STEP 2A — If REJECTED, reply EXACTLY:
IS_VALID: FALSE
Document Type: <exact item type>
Reason: <1 sentence why rejected>

STEP 2B — If ACCEPTED, reply EXACTLY (OCR extract all visible text):
IS_VALID: TRUE
Document Type: <exact document name e.g. PAN Card, Aadhaar Card, Sale Deed>
Holder Name: <extract name if visible>
ID Number: <PAN number / Aadhaar / any ID number if visible, else N/A>
Date of Birth: <if visible, else N/A>
Issued By: <issuing authority, e.g. Income Tax Department, UIDAI, Sub-Registrar>
Issue Date: <date visible, else N/A>
Parties Involved: <names of parties / document holder>
Overall Status: <1-sentence summary of what this document proves legally>`;

        let resText = '';
        let visionFailed = false;

        try {
          const response = await sendGeminiChatMessage(prompt, [], language, base64);
          if (!response || response.error || !response.text) {
            visionFailed = true;
          } else {
            resText = response.text || '';
            const errorPhrases = [
              'unable to view this document',
              'slow connection',
              'dobara upload',
              'VISION_UNAVAILABLE',
              'please try re-uploading',
              'network slow',
            ];
            const lowerRes = resText.toLowerCase();
            if (errorPhrases.some((p) => lowerRes.includes(p))) {
              visionFailed = true;
              resText = '';
            }
          }
        } catch (fetchErr: any) {
          console.warn('Vision fetch error:', fetchErr?.message);
          visionFailed = true;
        }

        const { targetCaseId, dbDocId } = await dbUploadPromise;
        const finalDocId = dbDocId || tempDocId;

        // Update doc ID in state if DB returned a real UUID
        if (finalDocId !== tempDocId) {
          setDocsList((prev) => prev.map((d) => (d.id === tempDocId ? { ...d, id: finalDocId } : d)));
          setSelectedDocId((curr) => (curr === tempDocId ? finalDocId : curr));
        }

        if (visionFailed) {
          setUploadErrorMsg('⚠️ Document analysis temporarily unavailable. Please try re-uploading in a moment.');
          setDocsList((prev) =>
            prev.map((d) =>
              (d.id === finalDocId || d.id === tempDocId) ? { ...d, status: 'Under Review' as const } : d
            )
          );
          return;
        }

        const isExplicitlyInvalid =
          resText.includes('IS_VALID: FALSE') ||
          resText.toLowerCase().includes('not a legal document') ||
          resText.toLowerCase().includes('train ticket') ||
          resText.toLowerCase().includes('bus ticket') ||
          resText.toLowerCase().includes('movie ticket') ||
          resText.toLowerCase().includes('blacklisted');

        // Smart IS_VALID detection: accept if AI explicitly says TRUE,
        // OR if response contains clear document fields (PAN/Aadhaar etc.) without a FALSE marker
        const hasExplicitTrue = resText.includes('IS_VALID: TRUE');
        const hasDocumentFields = (
          resText.match(/Document Type:\s*.+/i) !== null &&
          resText.match(/Overall Status:\s*.+/i) !== null
        );
        const isExplicitlyValid = hasExplicitTrue || (!isExplicitlyInvalid && hasDocumentFields);

        if (isExplicitlyInvalid) {
          const docTypeMatch = resText.match(/Document Type:\s*(.*)/i);
          const reasonMatch = resText.match(/Reason:\s*(.*)/i);
          const detectedType = docTypeMatch ? docTypeMatch[1].trim() : 'Non-Legal Document';
          const reasonStr = reasonMatch ? reasonMatch[1].trim() : `The uploaded file (${detectedType}) is not a valid legal document.`;

          setUploadErrorMsg(`❌ Blacklisted Item: ${detectedType}. ${reasonStr}`);
          await updateCaseDocumentAnalysis(finalDocId, targetCaseId, resText.substring(0, 250), `Blacklisted (${detectedType}): ${reasonStr}`, inferDocumentType(detectedType), false);

          setDocsList((prev) => {
            const updated = prev.map((d) =>
              (d.id === finalDocId || d.id === tempDocId)
                ? { ...d, status: 'False / Invalid' as const, rejectionReason: `Blacklisted (${detectedType}): ${reasonStr}` }
                : d
            );
            return updated;
          });
        } else if (isExplicitlyValid) {
          // Extract all OCR fields
          const typeMatch = resText.match(/Document Type:\s*(.*)/i);
          const holderMatch = resText.match(/Holder Name:\s*(.*)/i);
          const idNumMatch = resText.match(/ID Number:\s*(.*)/i);
          const dobMatch = resText.match(/Date of Birth:\s*(.*)/i);
          const issuedByMatch = resText.match(/Issued By:\s*(.*)/i);
          const issueDateMatch = resText.match(/Issue Date:\s*(.*)/i);
          const partiesMatch = resText.match(/Parties Involved:\s*(.*)/i);
          const statusMatch = resText.match(/Overall Status:\s*(.*)/i);
          // Legacy fields (sale deeds etc.)
          const stampMatch = resText.match(/Stamp Value:\s*(.*)/i);
          const dateMatch = resText.match(/Execution Date:\s*(.*)/i);

          const docTypeStr = typeMatch ? typeMatch[1].trim() : 'Legal Document';
          const usage = getDocumentUsageInfo(docTypeStr);

          // Build a rich display for the overall status
          const holderName = holderMatch ? holderMatch[1].trim() : '';
          const idNumber = idNumMatch ? idNumMatch[1].trim() : '';
          const dob = dobMatch ? dobMatch[1].trim() : '';
          const issuedBy = issuedByMatch ? issuedByMatch[1].trim() : '';
          const overallStatusText = statusMatch
            ? statusMatch[1].trim()
            : holderName
            ? `${docTypeStr} of ${holderName}${idNumber && idNumber !== 'N/A' ? ` (${idNumber})` : ''}. Issued by ${issuedBy || 'Government of India'}.`
            : 'Document verified & stored securely in private vault.';

          // Build parties/holder display
          const partiesDisplay =
            partiesMatch ? partiesMatch[1].trim() :
            holderName ? `${holderName}${dob && dob !== 'N/A' ? ` | DOB: ${dob}` : ''}${idNumber && idNumber !== 'N/A' ? ` | ID: ${idNumber}` : ''}` :
            'Identified from document';

          // Build date display
          const dateDisplay =
            dateMatch ? dateMatch[1].trim() :
            issueDateMatch ? issueDateMatch[1].trim() :
            'Extracted from document';

          const customAnalysis = {
            stampValue: stampMatch ? stampMatch[1].trim() : issuedBy ? `Issued by: ${issuedBy}` : `Type: ${docTypeStr}`,
            executionDate: dateDisplay,
            partiesInvolved: partiesDisplay,
            docType: docTypeStr,
            overallStatus: overallStatusText,
            usedFor: usage.usedFor,
            whereUsed: usage.whereUsed,
            authorityGranted: usage.authorityGranted,
          };

          await updateCaseDocumentAnalysis(
            finalDocId,
            targetCaseId,
            resText.substring(0, 250),
            customAnalysis.overallStatus,
            inferDocumentType(docTypeStr), // maps 'PAN Card' to 'other' or appropriate enum
            true
          );

          setDocsList((prev) => {
            const updated = prev.map((d) =>
              (d.id === finalDocId || d.id === tempDocId)
                ? { ...d, id: finalDocId, status: 'Verified' as const, customAnalysis }
                : d
            );
            try {
              localStorage.setItem(`mw_user_uploaded_docs_${currentUser?.userId || 'guest'}`, JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        } else {
          setDocsList((prev) => {
            const updated = prev.map((d) =>
              (d.id === finalDocId || d.id === tempDocId) ? { ...d, id: finalDocId, status: 'Under Review' as const } : d
            );
            try {
              localStorage.setItem(`mw_user_uploaded_docs_${currentUser?.userId || 'guest'}`, JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
          setUploadErrorMsg('⚠️ Document analysis inconclusive. Please re-upload for a clearer result.');
        }
      } catch (err) {
        console.error('Analysis error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    } catch (err) {
      console.error('File read error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col">
      {/* Top Bar Header */}
      <div className="bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-[#0F172A]">My Documents & AI Verification Vault</h1>
        </div>

        {/* Three-dot menu option */}
        <div className="relative">
          <button
            onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showOptionsDropdown && (
            <div className="absolute right-0 mt-1 w-48 bg-[#FFFFFF] rounded-xl shadow-lg border border-[#E2E8F0] py-1 text-xs font-medium z-50 animate-fadeIn">
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowOptionsDropdown(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-[#F8FAFC] flex items-center gap-2 text-[#334155]"
              >
                <Upload className="w-4 h-4 text-[#0F172A]" />
                <span>Upload New File</span>
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowOptionsDropdown(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-[#F8FAFC] flex items-center gap-2 text-[#334155]"
              >
                <FileText className="w-4 h-4 text-[#0F172A]" />
                <span>Print Analysis Report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error/Status Banner */}
      {uploadErrorMsg && (
        <div className={`mx-4 mt-4 p-3 rounded-lg border text-sm font-medium animate-fadeIn ${
          uploadErrorMsg.includes('❌') 
            ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]' 
            : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
        }`}>
          {uploadErrorMsg}
        </div>
      )}

      {/* Main 3-Column Content Grid */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Upload & Uploaded Docs (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Upload Box */}
          <div className="bg-[#FFFFFF] rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-[#0F172A]">Upload Legal Documents</h2>
            
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#CBD5E1] hover:border-[#1E3A8A] rounded-xl p-6 text-center space-y-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-all cursor-pointer"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

              <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#1E3A8A] flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs font-bold text-[#0F172A]">Drag & drop files here</p>
                <p className="text-xs text-[#2563EB] font-medium">or click to choose file from device</p>
                <p className="text-[10px] text-[#94A3B8] mt-1">PDF, JPG, PNG (Max 20MB)</p>
              </div>
            </div>
          </div>

          {/* Uploaded Documents List */}
          <div className="bg-[#FFFFFF] rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-[#0F172A]">My Documents ({docsList.length})</h2>

            {docsList.length === 0 ? (
              <p className="text-xs text-[#64748B] py-4 text-center">No documents uploaded yet. Uploaded and verified documents will appear here.</p>
            ) : (
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
                {docsList.map((doc) => {
                  const isSelected = doc.id === selectedDocId;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#F8FAFC] border-[#2563EB] ring-1 ring-[#2563EB]/20 shadow-2xs'
                          : 'bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-[#2563EB]" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-[#0F172A] truncate">{doc.name}</p>
                          <p className="text-[10px] text-[#64748B]">Saved on {doc.uploadDate}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          doc.status === 'Verified'
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : doc.status === 'Under Review'
                            ? 'bg-[#FEF3C7] text-[#B45309]'
                            : doc.status === 'False / Invalid'
                            ? 'bg-[#FEE2E2] text-[#991B1B] font-bold border border-[#FCA5A5]'
                            : 'bg-[#FFEDD5] text-[#C2410C]'
                        }`}
                      >
                        {doc.status}
                      </span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm('Remove this document from your vault?')) return;
                          try {
                            await deleteCaseDocument(doc.id);
                          } catch {}
                          setDocsList(prev => prev.filter(d => d.id !== doc.id));
                          if (selectedDocId === doc.id) setSelectedDocId(null);
                          // Clean localStorage
                          try {
                            const key = `mw_user_uploaded_docs_${currentUser?.userId || 'guest'}`;
                            const raw = localStorage.getItem(key);
                            if (raw) {
                              const list = JSON.parse(raw).filter((d: any) => d.id !== doc.id);
                              localStorage.setItem(key, JSON.stringify(list));
                            }
                          } catch {}
                        }}
                        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors shrink-0 ml-1"
                        title="Remove document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Document Viewer (6 cols) */}
        <div className="lg:col-span-6 flex flex-col bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
          
          {currentDoc ? (
            <>
              {/* Viewer Toolbar Top */}
              <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-2.5 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#0F172A] truncate">{currentDoc.name}</span>

                <div className="flex items-center gap-1.5 text-[#64748B]">
                  <button className="p-1 hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded cursor-pointer">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded cursor-pointer">
                    <Hand className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                    className="p-1 hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
                    className="p-1 hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded text-[11px] font-medium text-[#0F172A]">
                    <span>1/1</span>
                    <ChevronDown className="w-3 h-3 text-[#64748B]" />
                  </div>

                  <button className="p-1 hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded cursor-pointer">
                    <Crop className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded cursor-pointer">
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Full Size Document Canvas / Image Container */}
              <div className="flex-1 bg-[#F1F5F9] p-4 md:p-6 overflow-auto flex flex-col items-center justify-start min-h-[520px]">
                {isAnalyzing ? (
                  <div className="my-auto text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-[#0F172A]">Analyzing document text with OCR & AI...</p>
                  </div>
                ) : currentDoc.fileData ? (
                  <div className="w-full bg-[#FFFFFF] p-4 rounded-xl border border-[#CBD5E1] shadow-md space-y-4">
                    <img
                      src={`data:${currentDoc.fileData.mimeType};base64,${currentDoc.fileData.data}`}
                      alt="Uploaded Legal Document"
                      className="w-full h-auto object-contain max-h-[600px] rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="my-auto p-8 text-center space-y-3 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-sm max-w-md">
                    <FileText className="w-12 h-12 text-[#2563EB] mx-auto" />
                    <h3 className="text-sm font-bold text-[#0F172A]">{currentDoc.name}</h3>
                    <p className="text-xs text-[#64748B]">Document record loaded from vault. Select a file or upload a new scan to view full OCR extraction.</p>
                  </div>
                )}
              </div>

              {/* Bottom Viewer Toolbar */}
              <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-4 py-2.5 flex items-center justify-between text-xs text-[#64748B]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#0F172A] cursor-pointer"
                    title="Camera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-[#E2E8F0] cursor-pointer">
                    <Hand className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 font-semibold">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                    className="px-2 py-1 rounded bg-[#FFFFFF] border border-[#CBD5E1] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    -
                  </button>
                  <span>{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
                    className="px-2 py-1 rounded bg-[#FFFFFF] border border-[#CBD5E1] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    +
                  </button>
                  <button className="p-1 rounded hover:bg-[#E2E8F0] cursor-pointer ml-1">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 bg-[#F8FAFC] p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[520px]">
              <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center shadow-xs">
                <FileUp className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-bold text-[#0F172A]">No Legal Document Selected</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Upload your Sale Deed, Khatauni, Will, Lease Agreement, Stamp Paper, or Court Notice to run AI verification and store in your private vault.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-[#1F3864] hover:bg-[#1E293B] text-[#FFFFFF] font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: AI Analysis & Detailed Information (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[#FFFFFF] rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F172A]">AI Analysis & Legal Details</h2>
              {currentDoc && (
                <button
                  onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                  className="text-[#64748B] hover:text-[#0F172A] p-1 rounded hover:bg-[#F1F5F9]"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              )}
            </div>

            {isAnalyzing ? (
              <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-center space-y-3 animate-pulse">
                <div className="w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
                <div>
                  <p className="text-xs font-bold text-[#1E40AF]">AI is verifying & saving to vault...</p>
                  <p className="text-[11px] text-[#3B82F6] mt-0.5">
                    Extracting document type, usage purpose, authority, and verification status.
                  </p>
                </div>
              </div>
            ) : !currentDoc ? (
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-[#94A3B8] mx-auto" />
                <p className="text-xs font-bold text-[#0F172A]">Awaiting Document</p>
                <p className="text-[11px] text-[#64748B]">
                  Verified document records, usage information, and legal authority details will appear here.
                </p>
              </div>
            ) : currentDoc.status === 'False / Invalid' ? (
              <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-[#991B1B] font-bold text-xs">
                  <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />
                  <span>Document Rejected (Verification Failed)</span>
                </div>
                <p className="text-xs text-[#7F1D1D] leading-relaxed font-medium">
                  {currentDoc.rejectionReason || 'This document is not a valid legal document. It is blacklisted and not stored in your vault.'}
                </p>
                <div className="pt-2 border-t border-[#FECACA] text-[11px] text-[#991B1B]">
                  💡 Please upload a clear photo or PDF of an official legal paper (Sale Deed, Khatauni, Court Notice, Will, Stamp Paper, FIR, etc.).
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {/* Point 1: What it is used for */}
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#2563EB] text-[#FFFFFF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-bold text-[#0F172A]">What It Is Used For</h3>
                      <p className="text-xs text-[#475569] leading-relaxed">
                        {currentDoc.customAnalysis?.usedFor || 'Proves legal standing and establishes official rights.'}
                      </p>
                    </div>
                  </div>

                  {/* Point 2: Where it needs to be used */}
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#16A34A] text-[#FFFFFF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-bold text-[#0F172A]">Where It Needs To Be Used</h3>
                      <p className="text-xs text-[#475569] leading-relaxed">
                        {currentDoc.customAnalysis?.whereUsed || 'Relevant judicial or administrative authorities in India.'}
                      </p>
                    </div>
                  </div>

                  {/* Point 3: What authority it grants */}
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#7C3AED] text-[#FFFFFF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-bold text-[#0F172A]">What Authority It Grants</h3>
                      <p className="text-xs text-[#475569] leading-relaxed">
                        {currentDoc.customAnalysis?.authorityGranted || 'Grants statutory legal rights and evidentiary standing.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verification Status Card — dynamic based on actual doc status */}
                {currentDoc.status === 'Under Review' ? (
                  <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#92400E]">Verification Status</p>
                      <span className="text-[10px] bg-[#FEF3C7] text-[#B45309] font-bold px-2 py-0.5 rounded-full">
                        Under Review
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#92400E] font-medium leading-relaxed">
                        AI is analyzing this document. If the analysis failed, please re-upload a clearer image.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#166534]">Verification Status</p>
                      <span className="text-[10px] bg-[#DCFCE7] text-[#15803D] font-bold px-2 py-0.5 rounded-full">
                        Verified & Saved in Vault
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#15803D] font-medium leading-relaxed">
                        {currentDoc.customAnalysis?.overallStatus || 'Document verified successfully by AI and stored in your vault.'}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
