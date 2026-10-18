/**
 * Monthly expense category budget helpers.
 */

export interface ExpenseCatLike {
  id: string;
  name: string;
  monthlyBudget?: number;
}

export interface ExpenseTxLike {
  type: string;
  amount: number;
  date: string;
  category?: string;
  isDeleted?: boolean;
}

export interface CategoryBudgetStatus {
  categoryId: string;
  categoryName: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'ok' | 'warning' | 'over' | 'no_budget';
}

function inMonth(iso: string, year: number, month: number): boolean {
  if (!iso || iso.length < 7) return false;
  const y = parseInt(iso.slice(0, 4), 10);
  const m = parseInt(iso.slice(5, 7), 10);
  return y === year && m === month;
}

export function spentInCategoryMonth(
  categoryName: string,
  transactions: ExpenseTxLike[],
  year: number,
  month: number
): number {
  return transactions
    .filter(
      (t) =>
        !t.isDeleted &&
        t.type === 'Expense' &&
        inMonth(t.date, year, month) &&
        (t.category || '').toLowerCase() === categoryName.toLowerCase()
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

export function getCategoryBudgetStatuses(
  categories: ExpenseCatLike[],
  transactions: ExpenseTxLike[],
  year: number,
  month: number
): CategoryBudgetStatus[] {
  return categories.map((cat) => {
    const budget = Number(cat.monthlyBudget) || 0;
    const spent = spentInCategoryMonth(cat.name, transactions, year, month);
    if (budget <= 0) {
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        budget: 0,
        spent,
        remaining: 0,
        percentage: 0,
        status: 'no_budget' as const,
      };
    }
    const percentage = Math.min(200, (spent / budget) * 100);
    const remaining = budget - spent;
    let status: CategoryBudgetStatus['status'] = 'ok';
    if (spent > budget) status = 'over';
    else if (spent >= budget * 0.8) status = 'warning';
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      budget,
      spent,
      remaining,
      percentage,
      status,
    };
  });
}

export function wouldExceedBudget(
  categoryName: string,
  additionalAmount: number,
  categories: ExpenseCatLike[],
  transactions: ExpenseTxLike[],
  year: number,
  month: number
): { exceeds: boolean; budget: number; spent: number; projected: number } {
  const cat = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
  const budget = Number(cat?.monthlyBudget) || 0;
  const spent = spentInCategoryMonth(categoryName, transactions, year, month);
  const projected = spent + additionalAmount;
  return {
    exceeds: budget > 0 && projected > budget + 0.009,
    budget,
    spent,
    projected,
  };
}
