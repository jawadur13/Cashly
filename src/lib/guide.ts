/**
 * The Cashly user guide, as data. Shown on /help and linked from the in-app
 * help tips by section id (e.g. /help#transfers). Kept in one place so it can
 * be translated as a whole later.
 *
 * Every answer describes what the app actually does — update it alongside any
 * change to the behaviour it explains.
 */
import { PASSWORD_RESET_CONTACT } from './constants'

export interface GuideItem {
  /** Stable anchor: /help#<id>. */
  id: string
  question: string
  /** Paragraphs. */
  answer: string[]
  /** Optional numbered steps after the paragraphs. */
  steps?: string[]
}

export interface GuideSection {
  id: string
  title: string
  summary: string
  icon: 'sparkles' | 'plus' | 'transfer' | 'people' | 'share' | 'insights' | 'search' | 'install' | 'shield' | 'help'
  items: GuideItem[]
}

export const GUIDE: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    summary: 'Accounts, your main currency and your first transaction.',
    icon: 'sparkles',
    items: [
      {
        id: 'what-is-an-account',
        question: 'What is an account?',
        answer: [
          'An account is any place your money lives: cash in your wallet, a bank account, or a mobile wallet such as bKash or Nagad. Each one keeps its own balance, and Home adds them up into your total.',
          'Add, rename or delete accounts from Accounts (on a phone: tap your initials at the top right, then Accounts).',
        ],
      },
      {
        id: 'account-currency',
        question: 'Why can’t I change an account’s currency?',
        answer: [
          'Every amount in an account is stored in that account’s currency. Changing it later would silently change the value of everything already recorded, so the currency is fixed when you create the account.',
          'If you need a different currency, create a new account in it — for example a USD account for Payoneer.',
        ],
      },
      {
        id: 'main-currency',
        question: 'What is my main currency?',
        answer: [
          'Totals on Home, Insights and People are shown in your main currency. Accounts in other currencies are converted at live exchange rates for those totals; their own balances stay in their own currency.',
          'Change it in Settings → Show totals in.',
        ],
      },
      {
        id: 'first-transaction',
        question: 'How do I record my first transaction?',
        answer: ['Tap + (the round button in the middle of the bottom bar, or New transaction on a computer).'],
        steps: [
          'Choose the type: Expense, Income, Transfer, Give or Get.',
          'Type the amount.',
          'Pick the account and a category.',
          'Tap Save.',
        ],
      },
    ],
  },
  {
    id: 'recording',
    title: 'Recording transactions',
    summary: 'Adding, editing and deleting, and the shortcuts that save time.',
    icon: 'plus',
    items: [
      {
        id: 'quick-add',
        question: 'What do the fields mean?',
        answer: [
          'Amount is the only thing every transaction needs. Paid to (or Received from) is who the money went to or came from — it shows as the title in your activity. Note is anything you want to remember. When defaults to now; pick Yesterday or another date for something earlier.',
          'Cashly remembers the account you last used for each type and puts the categories you use most first.',
        ],
      },
      {
        id: 'save-and-add-another',
        question: 'Can I add several in a row?',
        answer: ['Yes. Tap Save & add another: the transaction is saved and the form clears for the next one, keeping the same type and account.'],
      },
      {
        id: 'edit-delete',
        question: 'How do I edit or delete a transaction?',
        answer: [
          'Tap it in Activity or on Home to open it. Change anything and tap Save changes, or tap Delete.',
          'After deleting, an Undo button appears for a few seconds. Tap it to bring the transaction back.',
        ],
      },
      {
        id: 'quick-actions',
        question: 'What are the four buttons on Home?',
        answer: ['Expense, Income, Transfer and Give / Get open the add form with that type already chosen.'],
      },
      {
        id: 'categories',
        question: 'Can I make my own categories?',
        answer: [
          'Yes — in Categories, or straight from the add form with the New chip. Built-in categories can’t be deleted. Deleting one of yours keeps its transactions; they show as Uncategorized.',
        ],
      },
    ],
  },
  {
    id: 'transfers',
    title: 'Transfers and fees',
    summary: 'Moving money between your own accounts.',
    icon: 'transfer',
    items: [
      {
        id: 'what-is-a-transfer',
        question: 'When should I use Transfer?',
        answer: [
          'Use Transfer when money moves between two of your own accounts — an ATM withdrawal (bank → cash), topping up bKash from your bank, or cashing out bKash.',
          'A transfer is not income or spending, so it doesn’t change your income, spending or savings. Your total stays the same apart from any fee.',
        ],
      },
      {
        id: 'transfer-fees',
        question: 'How do I record a cash-out fee?',
        answer: [
          'Enter the amount that left the first account, then tick A different amount arrived and enter what reached the second account. Cashly shows the difference as a fee (or a gain if more arrived).',
          'Fees are listed in Insights as Transfer fees.',
        ],
        steps: ['Amount sent: 4,055.80 (from bKash)', 'A different amount arrived: 4,000 (to Cash)', 'Cashly records a fee of 55.80'],
      },
      {
        id: 'transfer-currency',
        question: 'Can I transfer between currencies?',
        answer: ['Not yet. Both accounts in a transfer must use the same currency, so that no amount changes value.'],
      },
    ],
  },
  {
    id: 'give-get',
    title: 'Give, Get and settling up',
    summary: 'Keeping track of money between you and other people.',
    icon: 'people',
    items: [
      {
        id: 'give-vs-get',
        question: 'What’s the difference between Give and Get?',
        answer: [
          'Give is money you hand to someone — lending to them, or paying back money you owed. Get is money you receive from someone — borrowing from them, or being paid back.',
          'Cashly works out who owes whom from these, so you never have to calculate it yourself.',
        ],
      },
      {
        id: 'people-balance',
        question: 'How do I read a person’s balance?',
        answer: [
          'On People, a green amount with owes you means they owe you that much. A red amount with you owe means you owe them. Settled means you’re even.',
          'Give and Get don’t count as income or spending — they’re money moving between you and someone else.',
        ],
      },
      {
        id: 'settle-up',
        question: 'What does Settle up do?',
        answer: [
          'On a person’s page, Settle up opens the add form with the exact amount owed already filled in, as a Give or a Get depending on who owes whom. Save it and the balance goes to zero.',
        ],
      },
      {
        id: 'delete-person',
        question: 'Why can’t I delete someone?',
        answer: [
          'People who have transactions can’t be deleted, so your give and get history always stays complete. Delete or change their transactions first, and then you can delete the person.',
        ],
      },
    ],
  },
  {
    id: 'sharing',
    title: 'Share links',
    summary: 'Showing someone your history together.',
    icon: 'share',
    items: [
      {
        id: 'share-what',
        question: 'What does a share link show?',
        answer: [
          'Only your Give and Get history with that one person and the balance between you, always up to date. They don’t need an account, and they can’t see anything else — not your accounts, other people or other transactions.',
        ],
      },
      {
        id: 'share-how',
        question: 'How do I share or stop sharing?',
        answer: ['Open the person on People and tap Create share link (on a phone this opens your share menu). Tap Stop sharing to turn the link off — it stops working straight away.'],
      },
    ],
  },
  {
    id: 'insights',
    title: 'Insights explained',
    summary: 'What the numbers on Insights mean.',
    icon: 'insights',
    items: [
      {
        id: 'net-saved',
        question: 'What are net saved and the savings rate?',
        answer: [
          'Net saved is your income minus your spending for the period. The savings rate is the share of your income you kept: earn 10,000 and spend 7,500, and you saved 25%.',
          'A negative rate means you spent more than you earned in that period. Transfers and Give/Get are not included.',
        ],
      },
      {
        id: 'comparisons',
        question: 'What do the green and red comparisons mean?',
        answer: [
          'They compare the period with the one before. Green is good news and red is worth a look: more income is green, but more spending is red.',
        ],
      },
      {
        id: 'balance-moved',
        question: 'What is “balance moved from … to …”?',
        answer: ['Your total across all accounts at the start of the period and at the end of it.'],
      },
      {
        id: 'drill-down',
        question: 'Can I see what made up a category?',
        answer: ['Yes — tap any category under Spending by category or Income sources to see those transactions in Activity. Tap a month in the chart to see its numbers.'],
      },
    ],
  },
  {
    id: 'activity',
    title: 'Activity and search',
    summary: 'Finding any transaction quickly.',
    icon: 'search',
    items: [
      {
        id: 'search',
        question: 'What can I search for?',
        answer: ['Notes, who you paid or were paid by, category names, people and account names. Combine it with the type, period and account filters.'],
      },
      {
        id: 'filters-kept',
        question: 'Do my filters stay when I open a transaction?',
        answer: ['Yes. Edit a transaction and you return to the same filtered list. Filtered views can also be bookmarked.'],
      },
      {
        id: 'hide-balances',
        question: 'How do I hide my balances?',
        answer: [
          'Tap the eye on the Home balance card to hide or show amounts. To have them hidden every time Cashly opens, turn on Settings → Hide balances when Cashly opens.',
        ],
      },
    ],
  },
  {
    id: 'install',
    title: 'Install Cashly as an app',
    summary: 'Open Cashly from your home screen like any other app.',
    icon: 'install',
    items: [
      {
        id: 'install-android',
        question: 'On Android',
        answer: ['In Chrome, open cashly.mvp.bd, tap the ⋮ menu, then Install app (or Add to Home screen).'],
      },
      {
        id: 'install-iphone',
        question: 'On iPhone or iPad',
        answer: ['In Safari, open cashly.mvp.bd, tap the Share button, then Add to Home Screen.'],
      },
      {
        id: 'install-desktop',
        question: 'On a computer',
        answer: ['In Chrome, Edge or Brave, click the install icon at the right end of the address bar, or open the browser menu and choose Install Cashly.'],
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy and your data',
    summary: 'Who can see your money, and how to take it with you.',
    icon: 'shield',
    items: [
      {
        id: 'who-sees',
        question: 'Who can see my data?',
        answer: ['Only you. Your accounts and transactions are tied to your login. A person only sees your history with them if you create a share link for them.'],
      },
      {
        id: 'export',
        question: 'Can I download my transactions?',
        answer: ['Yes. Settings → Export transactions downloads all of them as a CSV file that opens in Excel or Google Sheets.'],
      },
      {
        id: 'delete-data',
        question: 'How do I delete everything?',
        answer: [
          'Settings → Delete all my data removes your transactions, accounts, custom categories, people and share links. It can’t be undone, so export first if you want a copy. You’ll be asked to type DELETE to confirm.',
        ],
      },
      {
        id: 'forgot-password',
        question: 'I forgot my password',
        answer: [
          PASSWORD_RESET_CONTACT
            ? `Email ${PASSWORD_RESET_CONTACT} from the address you use for Cashly and we’ll reset it for you.`
            : 'Use Forgot password? on the log-in screen to get a reset link by email.',
        ],
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    summary: 'When something doesn’t look right.',
    icon: 'help',
    items: [
      {
        id: 'wont-load',
        question: 'A screen says it couldn’t load',
        answer: ['Check your connection and tap Try again. Nothing is changed when a screen fails to load.'],
      },
      {
        id: 'numbers-off',
        question: 'A balance looks wrong',
        answer: [
          'Open the account’s activity (tap it on Home) and look for a transaction on the wrong account, a missing transfer fee, or a date in the wrong month. For totals, check that Settings → Show totals in is the currency you expect.',
        ],
      },
      {
        id: 'old-version',
        question: 'The app looks out of date',
        answer: ['Close Cashly and open it again, or refresh the page. The newest version loads automatically.'],
      },
    ],
  },
]

/** Lower-cased text of an item, for search. */
export function guideItemText(item: GuideItem): string {
  return [item.question, ...item.answer, ...(item.steps ?? [])].join(' ').toLowerCase()
}
