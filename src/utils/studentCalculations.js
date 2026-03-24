/**
 * Student-level calculations for the search feature.
 * Derives amount paid, outstanding balance, late fees, and payment history
 * from STUDENTS_MASTER and PAYMENTS_LOG data.
 */

export function getStudentRecord(data, student) {
  if (!data?.PAYMENTS_LOG) {
    return {
      ...student,
      amountPaid: 0,
      amountOutstanding: student.contractPrice,
      lateFees: 0,
      failedPayments: 0,
      payments: [],
    };
  }

  // Match payments by email (most reliable) or student ID
  const payments = data.PAYMENTS_LOG.filter(
    (p) =>
      (student.email && p.studentEmail && p.studentEmail.toLowerCase() === student.email.toLowerCase()) ||
      (student.studentId && p.studentId && p.studentId === student.studentId)
  );

  // Sort payments by date descending (newest first)
  const sortedPayments = [...payments].sort((a, b) => {
    const dateA = a.paymentDate ? new Date(a.paymentDate) : new Date(0);
    const dateB = b.paymentDate ? new Date(b.paymentDate) : new Date(0);
    return dateB - dateA;
  });

  const successfulPayments = payments.filter((p) => p.paymentStatus === 'Paid' && p.refunded !== 'Yes');
  const failedPayments = payments.filter((p) => p.paymentStatus === 'charge_failed');
  const refundedPayments = payments.filter((p) => p.refunded === 'Yes');

  const amountPaid = successfulPayments.reduce((sum, p) => sum + p.paymentAmount, 0);
  const refundedAmount = refundedPayments.reduce((sum, p) => sum + p.paymentAmount, 0);
  const netPaid = amountPaid - refundedAmount;
  const amountOutstanding = Math.max(0, student.contractPrice - netPaid);

  return {
    ...student,
    amountPaid: netPaid,
    amountOutstanding,
    lateFees: failedPayments.length, // Count of failed payment attempts
    failedPayments: failedPayments.length,
    payments: sortedPayments,
  };
}

export function searchStudents(data, query, location) {
  if (!data?.STUDENTS_MASTER || !query || query.trim().length < 2) return [];

  const q = query.trim().toLowerCase();

  let students = data.STUDENTS_MASTER;

  // Filter by location if provided (for manager view)
  if (location && location !== 'ALL') {
    students = students.filter((s) => s.location === location);
  }

  // Search by name, email, or phone
  const matches = students.filter((s) => {
    const name = (s.fullName || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    const phone = (s.phone || '').replace(/\D/g, '');
    const queryDigits = q.replace(/\D/g, '');

    return (
      name.includes(q) ||
      email.includes(q) ||
      (queryDigits.length >= 3 && phone.includes(queryDigits))
    );
  });

  // Limit results to 20
  return matches.slice(0, 20);
}
