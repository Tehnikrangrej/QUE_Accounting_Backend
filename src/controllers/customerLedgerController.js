const prisma = require("../config/prisma");
const generatePdf = require("../utils/generatePdfBuffer");
const ledgerTemplate = require("../templates/ledgerPdfTemplate");
const cloudinary = require("../config/cloudinary");

////////////////////////////////////////////////////////
// COMMON LEDGER DATA FUNCTION
////////////////////////////////////////////////////////
const getCustomerLedgerData = async (
  businessId,
  customerId,
  fromDate,
  toDate
) => {

  const start = new Date(fromDate);
  const end = new Date(toDate);

  ////////////////////// INVOICES //////////////////////
  const invoices = await prisma.invoice.findMany({
    where:{
      businessId,
      customerId,
      createdAt:{ gte:start, lte:end }
    },
    select:{
      invoiceNumber:true,
      grandTotal:true,
      createdAt:true
    }
  });

  ////////////////////// PAYMENTS //////////////////////
  const payments = await prisma.payment.findMany({
    where:{
      businessId,
      invoice:{ customerId },
      paymentDate:{ gte:start, lte:end }
    },
    select:{
      id:true,
      amount:true,
      paymentDate:true
    }
  });

  ////////////////////// CREDIT NOTES //////////////////////
  const creditNotes = await prisma.creditNote.findMany({
    where:{
      businessId,
      customerId,
      createdAt:{ gte:start, lte:end }
    },
    select:{
      creditNumber:true,
      amount:true,
      createdAt:true
    }
  });

  //////////////////////////////////////////////////////
  // BUILD LEDGER
  //////////////////////////////////////////////////////
  let ledger=[];

  invoices.forEach(inv=>{
    ledger.push({
      date:inv.createdAt,
      type:"INVOICE",
      refNo:inv.invoiceNumber,
      debit:Number(inv.grandTotal)||0,
      credit:0
    });
  });

  payments.forEach(pay=>{
    ledger.push({
      date:pay.paymentDate,
      type:"PAYMENT",
      refNo:pay.id,
      debit:0,
      credit:Number(pay.amount)||0
    });
  });

  creditNotes.forEach(cr=>{
    ledger.push({
      date:cr.createdAt,
      type:"CREDIT_NOTE",
      refNo:cr.creditNumber,
      debit:0,
      credit:Number(cr.amount)||0
    });
  });

  ledger.sort((a,b)=> new Date(a.date)-new Date(b.date));

  //////////////////////////////////////////////////////
  // RUNNING BALANCE
  //////////////////////////////////////////////////////
  let balance=0;

  const finalLedger=ledger.map(row=>{
    balance+=row.debit-row.credit;
    return {...row,balance};
  });

  return {
    fromDate,
    toDate,
    closingBalance:balance,
    data:finalLedger
  };
};

////////////////////////////////////////////////////////
// GET CUSTOMER LEDGER (BODY BASED)
////////////////////////////////////////////////////////
exports.getCustomerLedger = async (req,res)=>{
  try{

    const businessId=req.business.id;
    const {customerId}=req.params;
    const {fromDate,toDate}=req.body;

    if(!fromDate || !toDate){
      return res.status(400).json({
        success:false,
        message:"fromDate and toDate required"
      });
    }

    const ledger=await getCustomerLedgerData(
      businessId,
      customerId,
      fromDate,
      toDate
    );

    res.json({
      success:true,
      ...ledger
    });

  }catch(error){
    console.error(error);
    res.status(500).json({
      success:false,
      message:"Ledger fetch failed"
    });
  }
};

////////////////////////////////////////////////////////
// DOWNLOAD STATEMENT PDF
////////////////////////////////////////////////////////
exports.getCustomerStatementPdf = async (req,res)=>{
  try{

    const businessId=req.business.id;
    const {customerId}=req.params;
    const {fromDate,toDate}=req.body;

    if(!fromDate || !toDate){
      return res.status(400).json({
        success:false,
        message:"fromDate and toDate required"
      });
    }

    //////////////////////////////////////////////////////
    // LEDGER DATA
    //////////////////////////////////////////////////////
    const ledger=await getCustomerLedgerData(
      businessId,
      customerId,
      fromDate,
      toDate
    );

    //////////////////////////////////////////////////////
    // CUSTOMER
    //////////////////////////////////////////////////////
    const customer=await prisma.customer.findUnique({
      where:{id:customerId},
      select:{company:true}
    });

    //////////////////////////////////////////////////////
    // GENERATE HTML
    //////////////////////////////////////////////////////
    const html=ledgerTemplate({customer,ledger});

    //////////////////////////////////////////////////////
    // GENERATE PDF BUFFER
    //////////////////////////////////////////////////////
    const pdfBuffer=await generatePdf(html);

    //////////////////////////////////////////////////////
    // UPLOAD CLOUDINARY
    //////////////////////////////////////////////////////
    const upload=await new Promise((resolve,reject)=>{

      const stream=cloudinary.uploader.upload_stream(
        {
          resource_type:"raw",
          public_id:`statements/customer-${customerId}-${Date.now()}`,
          format:"pdf"
        },
        (err,result)=>{
          if(err) return reject(err);
          resolve(result);
        }
      );

      stream.end(pdfBuffer);
    });

    //////////////////////////////////////////////////////
    // RETURN URL
    //////////////////////////////////////////////////////
    res.json({
      success:true,
      pdfUrl:upload.secure_url
    });

  }catch(error){
    console.error("STATEMENT ERROR:",error);

    res.status(500).json({
      success:false,
      message:"Statement generation failed"
    });
  }
};