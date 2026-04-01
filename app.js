import { supabase } from './supabase.js';

const state = {
  session: null,
  user: null,
  profile: null,
  households: [],
  householdUsers: [],
  activeHouseholdId: null,
  categories: [],
  budgets: [],
  transactions: [],
  selectedMonth: getCurrentMonth(),
  selectedView: 'household',
  editingCategoryId: null,
  editingBudgetId: null,
  editingTransactionId: null,
  onboardingAutoShown: false,
  onboardingStep: 1,
  activeScreen: 'management',
  isHydrating: false,
  hasBooted: false,
  refreshToken: 0,
  isSavingTransaction: false,
};

const el = {
  authView: byId('authView'),
  signupView: byId('signupView'),
  appView: byId('appView'),
  authMessage: byId('authMessage'),
  appMessage: byId('appMessage'),

  loginEmail: byId('loginEmail'),
  loginPassword: byId('loginPassword'),
  signupName: byId('signupName'),
  signupCurrency: byId('signupCurrency'),
  signupEmail: byId('signupEmail'),
  signupPassword: byId('signupPassword'),

  currentUserName: byId('currentUserName'),
  currentUserEmail: byId('currentUserEmail'),
  selectedMonth: byId('selectedMonth'),
  householdName: byId('householdName'),
  joinHouseholdId: byId('joinHouseholdId'),
  householdList: byId('householdList'),
  scopeFilters: byId('scopeFilters'),
  currentViewTitle: byId('currentViewTitle'),
  currentViewSubtitle: byId('currentViewSubtitle'),
  viewTabCaption: byId('viewTabCaption'),

  decisionStatusCard: byId('decisionStatusCard'),
  decisionStatusPill: byId('decisionStatusPill'),
  decisionStatusTitle: byId('decisionStatusTitle'),
  decisionStatusSummary: byId('decisionStatusSummary'),
  decisionMonthProgress: byId('decisionMonthProgress'),
  decisionSpendProgress: byId('decisionSpendProgress'),
  decisionAlerts: byId('decisionAlerts'),
  decisionActionTitle: byId('decisionActionTitle'),
  decisionActionBody: byId('decisionActionBody'),

  categoryName: byId('categoryName'),
  categoryOwnerScope: byId('categoryOwnerScope'),
  categoryCurrency: byId('categoryCurrency'),
  budgetAmount: byId('budgetAmount'),

  txDate: byId('txDate'),
  txCategory: byId('txCategory'),
  txAmount: byId('txAmount'),
  txCurrency: byId('txCurrency'),
  txDescription: byId('txDescription'),

  totalBudget: byId('totalBudget'),
  totalSpent: byId('totalSpent'),
  totalRemaining: byId('totalRemaining'),
  totalCategories: byId('totalCategories'),
  budgetsTable: byId('budgetsTable'),
  transactionsTable: byId('transactionsTable'),

  categoryModal: byId('categoryModal'),
  categoryModalTitle: byId('categoryModalTitle'),
  editCategoryName: byId('editCategoryName'),
  editCategoryOwnerScope: byId('editCategoryOwnerScope'),
  editCategoryCurrency: byId('editCategoryCurrency'),
  editBudgetAmount: byId('editBudgetAmount'),
  btnSaveCategoryEdit: byId('btnSaveCategoryEdit'),

  transactionModal: byId('transactionModal'),
  transactionModalTitle: byId('transactionModalTitle'),
  editTxDate: byId('editTxDate'),
  editTxCategory: byId('editTxCategory'),
  editTxAmount: byId('editTxAmount'),
  editTxCurrency: byId('editTxCurrency'),
  editTxDescription: byId('editTxDescription'),
  btnSaveTransactionEdit: byId('btnSaveTransactionEdit'),

  btnLogin: byId('btnLogin'),
  btnOpenOnboarding: byId('btnOpenOnboarding'),
  onboardingModal: byId('onboardingModal'),
  btnStartOnboarding: byId('btnStartOnboarding'),
  onboardingStepBadge: byId('onboardingStepBadge'),
  onboardingStepTitle: byId('onboardingStepTitle'),
  onboardingStepDescription: byId('onboardingStepDescription'),
  onboardingStep1: byId('onboardingStep1'),
  onboardingStep2: byId('onboardingStep2'),
  onboardingStep3: byId('onboardingStep3'),
  onboardingHouseholdName: byId('onboardingHouseholdName'),
  btnOnboardingCreateHousehold: byId('btnOnboardingCreateHousehold'),
  onboardingCategoryName: byId('onboardingCategoryName'),
  onboardingCategoryScope: byId('onboardingCategoryScope'),
  onboardingCategoryCurrency: byId('onboardingCategoryCurrency'),
  onboardingBudgetAmount: byId('onboardingBudgetAmount'),
  btnOnboardingCreateCategory: byId('btnOnboardingCreateCategory'),
  btnOnboardingGoTransactions: byId('btnOnboardingGoTransactions'),
  activeHouseholdCard: byId('activeHouseholdCard'),
  activeHouseholdName: byId('activeHouseholdName'),
  activeHouseholdId: byId('activeHouseholdId'),
  btnCopyHouseholdId: byId('btnCopyHouseholdId'),
};

bindEvents();
boot();

async function boot() {
  if (el.selectedMonth) el.selectedMonth.value = state.selectedMonth;
  if (el.txDate) el.txDate.value = getToday();

  try {
    const { data } = await supabase.auth.getSession();
    state.session = data.session;

    if (state.session?.user) {
      if (el.signupView && !el.appView) {
        window.location.replace('./index.html');
        return;
      }
      await hydrateAndRenderApp(state.session.user);
    } else {
      renderAuthState();
    }
  } catch (error) {
    console.error(error);
    renderAuthState();
    showAuthMessage('Não foi possível iniciar a aplicação.', 'error');
  }

  state.hasBooted = true;

  supabase.auth.onAuthStateChange(async (event, session) => {
    state.session = session;

    if (!state.hasBooted) return;

    try {
      if (!session?.user || event === 'SIGNED_OUT') {
        resetStateAfterLogout();
        renderAuthState();
        return;
      }

      if (el.signupView && !el.appView) {
        window.location.replace('./index.html');
        return;
      }

      const currentUserId = state.user?.id || null;
      const nextUserId = session.user?.id || null;
      const shouldHardRefresh =
        event === 'SIGNED_IN' ||
        !currentUserId ||
        currentUserId !== nextUserId;

      if (shouldHardRefresh) {
        await hydrateAndRenderApp(session.user);
        return;
      }

      if (nextUserId) {
        state.user = session.user;
      }
    } catch (error) {
      console.error(error);
      showAppMessage('Não foi possível atualizar os dados da aplicação.', 'error');
    }
  });
}

function bindEvents() {
  bindClick('btnLogin', login);
  bindClick('btnSignup', signup);
  bindClick('btnLogout', logout);
  bindClick('btnCreateHousehold', createHousehold);
  bindClick('btnJoinHousehold', joinHousehold);
  bindClick('btnCreateCategory', createCategoryAndBudget);
  bindClick('btnAddTransaction', addTransaction);
  bindClick('btnSaveCategoryEdit', saveCategoryEdit);
  bindClick('btnSaveTransactionEdit', saveTransactionEdit);
  bindClick('btnOpenOnboarding', () => { state.onboardingStep = 1; renderOnboardingStep(); openModal('onboardingModal'); });
  bindClick('btnStartOnboarding', startOnboarding);
  bindClick('btnOnboardingCreateHousehold', createHouseholdFromOnboarding);
  bindClick('btnOnboardingCreateCategory', createCategoryFromOnboarding);
  bindClick('btnOnboardingGoTransactions', finishOnboarding);
  bindClick('btnCopyHouseholdId', copyActiveHouseholdId);


  document.querySelectorAll('[data-screen-target]').forEach((node) => {
    node.addEventListener('click', () => setActiveScreen(node.dataset.screenTarget));
  });

  if (el.selectedMonth) {
    el.selectedMonth.addEventListener('change', async (e) => {
      state.selectedMonth = e.target.value;
      syncTransactionDateWithSelectedMonth();
      await loadBudgetsAndTransactions();
      renderCategoryOptions();
      renderDashboard();
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach((node) => {
    node.addEventListener('click', () => closeModal(node.dataset.closeModal));
  });

  if (el.categoryModal) {
    el.categoryModal.addEventListener('click', (e) => {
      if (e.target === el.categoryModal) closeModal('categoryModal');
    });
  }

  if (el.transactionModal) {
    el.transactionModal.addEventListener('click', (e) => {
      if (e.target === el.transactionModal) closeModal('transactionModal');
    });
  }

  if (el.onboardingModal) {
    el.onboardingModal.addEventListener('click', (e) => {
      if (e.target === el.onboardingModal) closeModal('onboardingModal');
    });
  }
}

async function signup() {
  clearMessages();

  const full_name = valueOf(el.signupName);
  const default_currency = el.signupCurrency?.value;
  const email = valueOf(el.signupEmail);
  const password = valueOf(el.signupPassword);

  if (!full_name || !email || !password) {
    showAuthMessage('Preencha nome, email e senha.', 'error');
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, default_currency } },
  });

  if (error) {
    showAuthMessage(mapSupabaseError(error), 'error');
    return;
  }

  showAuthMessage('Conta criada com sucesso. Agora volte para o login e entre normalmente.', 'success');
}

async function login() {
  clearMessages();

  const email = valueOf(el.loginEmail);
  const password = valueOf(el.loginPassword);

  if (!email || !password) {
    showAuthMessage('Preencha email e senha.', 'error');
    return;
  }

  setButtonLoading(el.btnLogin, true, 'Entrando');

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setButtonLoading(el.btnLogin, false);
    showAuthMessage(mapSupabaseError(error), 'error');
  }
}

async function logout() {
  clearMessages();
  resetStateAfterLogout();
  renderAuthState();

  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error(error);
  } finally {
    window.location.replace('./index.html');
  }
}

async function hydrateUser(user) {
  state.user = user;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (error) {
    showAppMessage('Não foi possível carregar o perfil.', 'error');
    return;
  }

  state.profile = data;
  syncPreferredCurrency();
}

function syncPreferredCurrency() {
  if (el.categoryCurrency && state.profile?.default_currency) {
    el.categoryCurrency.value = state.profile.default_currency;
  }
  if (el.txCurrency && state.profile?.default_currency) {
    el.txCurrency.value = state.profile.default_currency;
  }
}

async function hydrateAndRenderApp(user) {
  if (!el.appView) return;

  const refreshToken = ++state.refreshToken;
  state.isHydrating = true;

  try {
    await hydrateUser(user);
    await loadAll();

    if (refreshToken !== state.refreshToken) return;

    renderApp();
  } finally {
    if (refreshToken === state.refreshToken) {
      state.isHydrating = false;
    }
  }
}

async function loadAll() {
  await loadHouseholds();
  await loadHouseholdUsers();
  await loadBudgetsAndTransactions();
}

async function loadHouseholds() {
  const { data, error } = await supabase
    .from('household_members')
    .select(`
      household_id,
      role,
      households:household_id (
        id,
        name
      )
    `)
    .order('created_at', { ascending: true });

  if (error) {
    showAppMessage('Não foi possível carregar as casas do usuário.', 'error');
    return;
  }

  state.households = (data || []).map((item) => ({
    household_id: item.household_id,
    role: item.role,
    name: item.households?.name || 'Casa sem nome',
  }));

  if (!state.activeHouseholdId && state.households.length > 0) {
    state.activeHouseholdId = state.households[0].household_id;
  }
}

async function loadHouseholdUsers() {
  if (!state.activeHouseholdId) {
    state.householdUsers = [];
    return;
  }

  const { data, error } = await supabase
    .from('household_members')
    .select(`
      user_id,
      role,
      profiles:user_id (
        id,
        full_name,
        default_currency
      )
    `)
    .eq('household_id', state.activeHouseholdId)
    .order('created_at', { ascending: true });

  if (error) {
    showAppMessage('Não foi possível carregar as pessoas desta casa.', 'error');
    state.householdUsers = [];
    return;
  }

  state.householdUsers = (data || []).map((item) => ({
    user_id: item.user_id,
    role: item.role,
    full_name: item.profiles?.full_name || 'Pessoa',
    default_currency: item.profiles?.default_currency || 'BRL',
  }));

  ensureValidSelectedView();
}

function ensureValidSelectedView() {
  if (state.selectedView === 'household' || state.selectedView === 'shared') return;
  if (!state.selectedView.startsWith('member:')) {
    state.selectedView = 'household';
    return;
  }

  const userId = state.selectedView.replace('member:', '');
  const exists = state.householdUsers.some((item) => item.user_id === userId);
  if (!exists) state.selectedView = 'household';
}

async function loadBudgetsAndTransactions() {
  if (!state.activeHouseholdId) {
    state.categories = [];
    state.budgets = [];
    state.transactions = [];
    return;
  }

  const firstDay = `${state.selectedMonth}-01`;
  const lastDay = getLastDayOfMonth(state.selectedMonth);

  const [categoriesRes, budgetsRes, transactionsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('household_id', state.activeHouseholdId)
      .eq('is_active', true)
      .order('name', { ascending: true }),

    supabase
      .from('monthly_budgets')
      .select(`
        *,
        categories:category_id (
          id,
          name,
          scope,
          owner_user_id
        )
      `)
      .eq('household_id', state.activeHouseholdId)
      .lte('year_month', firstDay)
      .order('year_month', { ascending: false })
      .order('created_at', { ascending: false }),

    supabase
      .from('transactions')
      .select(`
        *,
        categories:category_id (
          id,
          name,
          scope,
          owner_user_id
        )
      `)
      .eq('household_id', state.activeHouseholdId)
      .gte('occurred_on', firstDay)
      .lte('occurred_on', lastDay)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (categoriesRes.error) showAppMessage(mapSupabaseError(categoriesRes.error), 'error');
  if (budgetsRes.error) showAppMessage(mapSupabaseError(budgetsRes.error), 'error');
  if (transactionsRes.error) showAppMessage(mapSupabaseError(transactionsRes.error), 'error');

  state.categories = categoriesRes.data || [];
  state.budgets = resolveBudgetsForMonth({
    categories: state.categories,
    budgets: budgetsRes.data || [],
    selectedMonthFirstDay: firstDay,
  });
  state.transactions = transactionsRes.data || [];
}

function resolveBudgetsForMonth({ categories, budgets, selectedMonthFirstDay }) {
  const latestBudgetByCategory = new Map();

  budgets.forEach((budget) => {
    if (!budget?.category_id) return;
    if (!latestBudgetByCategory.has(budget.category_id)) {
      latestBudgetByCategory.set(budget.category_id, budget);
    }
  });

  return (categories || []).map((category) => {
    const latestBudget = latestBudgetByCategory.get(category.id);

    if (latestBudget) {
      return {
        ...latestBudget,
        categories: latestBudget.categories || category,
        _hasCurrentMonthBudget: latestBudget.year_month === selectedMonthFirstDay,
        _isCarriedForward: latestBudget.year_month !== selectedMonthFirstDay,
      };
    }

    return {
      id: null,
      household_id: state.activeHouseholdId,
      category_id: category.id,
      owner_user_id: category.owner_user_id,
      year_month: selectedMonthFirstDay,
      amount: 0,
      currency: getDefaultCurrencyForCategory(category),
      categories: category,
      _hasCurrentMonthBudget: false,
      _isCarriedForward: false,
    };
  });
}

async function createHouseholdRecord(name) {
  const { data: houseData, error: houseError } = await supabase
    .from('households')
    .insert([{ name, created_by: state.user.id }])
    .select()
    .single();

  if (houseError) throw houseError;

  const { error: memberError } = await supabase.from('household_members').insert([
    { household_id: houseData.id, user_id: state.user.id, role: 'owner' },
  ]);

  if (memberError && !isDuplicateKey(memberError)) throw memberError;

  state.activeHouseholdId = houseData.id;
  state.selectedView = 'household';
  await loadAll();
  renderApp();
  return houseData;
}

async function createCategoryBudgetRecord({ name, ownerScope, currency, budgetAmount }) {
  const { scope, owner_user_id } = resolveScopeSelection(ownerScope);
  const year_month = `${state.selectedMonth}-01`;

  const { data: categoryData, error: categoryError } = await supabase
    .from('categories')
    .insert([{ household_id: state.activeHouseholdId, owner_user_id, name, scope }])
    .select()
    .single();

  if (categoryError) throw categoryError;

  const { error: budgetError } = await supabase.from('monthly_budgets').insert([
    {
      household_id: state.activeHouseholdId,
      category_id: categoryData.id,
      owner_user_id,
      year_month,
      amount: budgetAmount,
      currency,
    },
  ]);

  if (budgetError) throw budgetError;

  await loadBudgetsAndTransactions();
  renderApp();
  return categoryData;
}

async function createHousehold() {
  clearMessages();

  const name = valueOf(el.householdName);
  if (!name) {
    showAppMessage('Digite o nome da casa.', 'error');
    return;
  }

  try {
    const houseData = await createHouseholdRecord(name);
    if (el.householdName) el.householdName.value = '';
    showAppMessage(`Casa criada com sucesso. ID da casa: ${houseData.id}`, 'success');
  } catch (error) {
    showAppMessage(mapSupabaseError(error), 'error');
  }
}

async function createHouseholdFromOnboarding() {
  clearMessages();
  const name = valueOf(el.onboardingHouseholdName);

  if (!name) {
    showAppMessage('Digite o nome da casa para continuar.', 'error');
    return;
  }

  try {
    const houseData = await createHouseholdRecord(name);
    if (el.onboardingHouseholdName) el.onboardingHouseholdName.value = '';
    state.onboardingStep = 2;
    renderOnboardingStep();
    if (el.onboardingCategoryName) el.onboardingCategoryName.focus();
    showAppMessage(`Casa criada com sucesso. ID da casa: ${houseData.id}`, 'success');
  } catch (error) {
    showAppMessage(mapSupabaseError(error), 'error');
  }
}


async function joinHousehold() {
  clearMessages();

  const householdId = valueOf(el.joinHouseholdId);
  if (!householdId) {
    showAppMessage('Cole o ID da casa para entrar.', 'error');
    return;
  }

  const { error } = await supabase.from('household_members').insert([
    {
      household_id: householdId,
      user_id: state.user.id,
      role: 'member',
    },
  ]);

  if (error) {
    showAppMessage(mapSupabaseError(error), 'error');
    return;
  }

  state.activeHouseholdId = householdId;
  state.selectedView = 'household';
  if (el.joinHouseholdId) el.joinHouseholdId.value = '';

  await loadAll();
  renderApp();
  showAppMessage('Você entrou na casa com sucesso.', 'success');
}

async function createCategoryAndBudget() {
  clearMessages();

  if (!state.activeHouseholdId) {
    showAppMessage('Crie ou entre em uma casa antes.', 'error');
    return;
  }

  const name = valueOf(el.categoryName);
  const ownerScope = el.categoryOwnerScope?.value;
  const currency = el.categoryCurrency?.value;
  const budgetAmount = parseCurrencyInput(valueOf(el.budgetAmount));

  if (!name) {
    showAppMessage('Digite o nome da categoria.', 'error');
    return;
  }

  if (Number.isNaN(budgetAmount) || budgetAmount < 0) {
    showAppMessage('Digite um limite mensal válido.', 'error');
    return;
  }

  try {
    await createCategoryBudgetRecord({ name, ownerScope, currency, budgetAmount });
    if (el.categoryName) el.categoryName.value = '';
    if (el.budgetAmount) el.budgetAmount.value = '';
    showAppMessage('Categoria e limite mensal criados com sucesso.', 'success');
  } catch (error) {
    showAppMessage(mapSupabaseError(error), 'error');
  }
}

async function createCategoryFromOnboarding() {
  clearMessages();

  if (!state.activeHouseholdId) {
    showAppMessage('Crie a casa primeiro para seguir.', 'error');
    state.onboardingStep = 1;
    renderOnboardingStep();
    return;
  }

  const name = valueOf(el.onboardingCategoryName);
  const ownerScope = el.onboardingCategoryScope?.value;
  const currency = el.onboardingCategoryCurrency?.value;
  const budgetAmount = parseCurrencyInput(valueOf(el.onboardingBudgetAmount));

  if (!name) {
    showAppMessage('Digite a primeira categoria para continuar.', 'error');
    return;
  }

  if (Number.isNaN(budgetAmount) || budgetAmount < 0) {
    showAppMessage('Digite um limite mensal válido.', 'error');
    return;
  }

  try {
    await createCategoryBudgetRecord({ name, ownerScope, currency, budgetAmount });
    if (el.onboardingCategoryName) el.onboardingCategoryName.value = '';
    if (el.onboardingBudgetAmount) el.onboardingBudgetAmount.value = '';
    state.onboardingStep = 3;
    renderOnboardingStep();
    showAppMessage('Primeira categoria criada com sucesso.', 'success');
  } catch (error) {
    showAppMessage(mapSupabaseError(error), 'error');
  }
}


async function addTransaction() {
  clearMessages();

  if (state.isSavingTransaction) {
    showActionFeedback('Já existe um lançamento sendo salvo. Aguarde terminar.', 'info', 'transactionsPanel');
    return;
  }

  if (!state.activeHouseholdId) {
    showAppMessage('Crie ou entre em uma casa antes.', 'error');
    return;
  }

  const occurred_on = el.txDate?.value;
  const category_id = el.txCategory?.value;
  const amount = parseCurrencyInput(valueOf(el.txAmount));
  const currency = el.txCurrency?.value;
  const description = valueOf(el.txDescription);
  const submitButton = byId('btnAddTransaction');

  if (!occurred_on || Number.isNaN(amount) || amount <= 0) {
    showActionFeedback('Preencha data e valor válido.', 'error', 'transactionsPanel');
    return;
  }

  if (!category_id) {
    if (state.isHydrating) {
      showActionFeedback('As categorias ainda estão carregando. Aguarde a lista aparecer e tente de novo.', 'info', 'transactionsPanel');
    } else {
      showActionFeedback('Selecione uma categoria antes de salvar o gasto.', 'error', 'transactionsPanel');
    }
    return;
  }

  if (!isDateInYearMonth(occurred_on, state.selectedMonth)) {
    showActionFeedback('A data do lançamento precisa estar dentro do mês de referência selecionado.', 'error', 'transactionsPanel');
    syncTransactionDateWithSelectedMonth(true);
    return;
  }

  const category = state.categories.find((item) => item.id === category_id);
  if (!category) {
    showActionFeedback('A categoria escolhida não está disponível nesta visão.', 'error', 'transactionsPanel');
    renderCategoryOptions();
    return;
  }

  state.isSavingTransaction = true;
  setButtonLoading(submitButton, true, 'Salvando');

  try {
    const { error } = await supabase.from('transactions').insert([
      {
        household_id: state.activeHouseholdId,
        owner_user_id: state.user.id,
        category_id,
        occurred_on,
        amount,
        currency,
        description,
      },
    ]);

    if (error) {
      showActionFeedback(mapSupabaseError(error), 'error', 'transactionsPanel');
      return;
    }

    const optimisticTransaction = {
      id: `temp-${Date.now()}`,
      household_id: state.activeHouseholdId,
      owner_user_id: state.user.id,
      category_id,
      occurred_on,
      amount,
      currency,
      description,
      created_at: new Date().toISOString(),
      categories: {
        id: category.id,
        name: category.name,
        scope: category.scope,
        owner_user_id: category.owner_user_id,
      },
      scopeKey: getScopeKey(category),
      scopeLabel: getScopeLabelFromCategory(category),
    };

    state.transactions = [optimisticTransaction, ...state.transactions.filter((item) => !String(item.id).startsWith('temp-'))];

    if (el.txAmount) el.txAmount.value = '';
    if (el.txDescription) el.txDescription.value = '';

    renderDashboard();
    showActionFeedback('Gasto lançado com sucesso. Atualizando o painel em segundo plano...', 'success', 'transactionsPanel');
  } catch (error) {
    console.error(error);
    showActionFeedback('Não foi possível salvar o gasto agora. Tente de novo.', 'error', 'transactionsPanel');
    return;
  } finally {
    state.isSavingTransaction = false;
    setButtonLoading(submitButton, false);
  }

  backgroundRefreshAfterTransactionSave();
}

async function backgroundRefreshAfterTransactionSave() {
  try {
    await withTimeout(loadBudgetsAndTransactions(), 12000, 'Atualização do painel demorou demais');
    renderCategoryOptions();
    renderDashboard();
  } catch (error) {
    console.error(error);
    showActionFeedback('O gasto foi salvo, mas o painel demorou para atualizar. Recarregue a página se necessário.', 'info', 'transactionsPanel');
  }
}

function renderAuthState() {
  closeModal('categoryModal');
  closeModal('transactionModal');
  closeModal('onboardingModal');
  setButtonLoading(el.btnLogin, false);

  if (el.authView) el.authView.hidden = false;
  if (el.signupView) el.signupView.hidden = false;
  if (el.appView) el.appView.hidden = true;

  if (el.txCategory) el.txCategory.innerHTML = '<option value="">Selecione</option>';
  if (el.editTxCategory) el.editTxCategory.innerHTML = '<option value="">Selecione</option>';
  if (el.budgetsTable) el.budgetsTable.innerHTML = '';
  if (el.transactionsTable) el.transactionsTable.innerHTML = '';
}

function renderApp() {
  if (!el.appView) return;

  setButtonLoading(el.btnLogin, false);
  if (el.selectedMonth) el.selectedMonth.value = state.selectedMonth;
  syncTransactionDateWithSelectedMonth();
  if (el.authView) el.authView.hidden = true;
  if (el.appView) el.appView.hidden = false;

  if (el.currentUserName) el.currentUserName.textContent = state.profile?.full_name || 'Usuário';
  if (el.currentUserEmail) el.currentUserEmail.textContent = state.user?.email || '';

  renderHouseholds();
  renderActiveHouseholdCard();
  renderScreenNavigation();
  renderScopeFilters();
  renderOwnerScopeOptions();
  renderOnboardingStep();
  renderCategoryOptions();
  renderDashboard();
  maybeAutoOpenOnboarding();
}

function setActiveScreen(screen) {
  state.activeScreen = screen;
  renderScreenNavigation();
}

function renderScreenNavigation() {
  document.querySelectorAll('[data-screen-target]').forEach((node) => {
    node.classList.toggle('active', node.dataset.screenTarget === state.activeScreen);
  });

  document.querySelectorAll('[data-screen]').forEach((node) => {
    node.hidden = node.dataset.screen !== state.activeScreen;
  });
}

function renderOnboardingStep() {
  if (!el.onboardingModal) return;

  const step = state.onboardingStep || 1;
  const configs = {
    1: { badge: 'Passo 1 de 3', title: 'Crie sua casa', desc: 'Dê um nome para a casa. Depois o SOMA guarda o ID para você convidar a outra pessoa em Configurações.' },
    2: { badge: 'Passo 2 de 3', title: 'Cadastre sua primeira categoria', desc: 'Escolha onde essa categoria vive: em uma pessoa específica ou no compartilhado.' },
    3: { badge: 'Passo 3 de 3', title: 'Tudo pronto para começar', desc: 'Casa e primeira categoria configuradas. Falta só registrar o primeiro gasto do mês.' },
  };

  const meta = configs[step] || configs[1];
  if (el.onboardingStepBadge) el.onboardingStepBadge.textContent = meta.badge;
  if (el.onboardingStepTitle) el.onboardingStepTitle.textContent = meta.title;
  if (el.onboardingStepDescription) el.onboardingStepDescription.textContent = meta.desc;

  if (el.onboardingStep1) el.onboardingStep1.hidden = step !== 1;
  if (el.onboardingStep2) el.onboardingStep2.hidden = step !== 2;
  if (el.onboardingStep3) el.onboardingStep3.hidden = step !== 3;
}

function finishOnboarding() {
  window.localStorage.setItem(getOnboardingStorageKey(), 'seen');
  closeModal('onboardingModal');
  setActiveScreen('management');
  const txPanel = byId('transactionsPanel');
  if (txPanel) txPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (el.txAmount) el.txAmount.focus();
}

function renderHouseholds() {
  if (!el.householdList) return;

  el.householdList.innerHTML = '';

  if (state.households.length === 0) {
    el.householdList.innerHTML = '<div class="empty-state">Você ainda não faz parte de nenhuma casa.</div>';
    return;
  }

  state.households.forEach((item) => {
    const button = document.createElement('button');
    button.className = `household-chip ${item.household_id === state.activeHouseholdId ? 'active' : ''}`;
    button.textContent = `${item.name} (${item.role})`;
    button.addEventListener('click', async () => {
      state.activeHouseholdId = item.household_id;
      state.selectedView = 'household';
      await loadHouseholdUsers();
      await loadBudgetsAndTransactions();
      renderApp();
    });
    el.householdList.appendChild(button);
  });
}

function renderActiveHouseholdCard() {
  if (!el.activeHouseholdCard || !el.activeHouseholdName || !el.activeHouseholdId) return;

  const activeHousehold = state.households.find((item) => item.household_id === state.activeHouseholdId);

  if (!state.activeHouseholdId || !activeHousehold) {
    el.activeHouseholdCard.hidden = true;
    el.activeHouseholdName.textContent = 'Casa ativa';
    el.activeHouseholdId.textContent = '—';
    return;
  }

  el.activeHouseholdCard.hidden = false;
  el.activeHouseholdName.textContent = activeHousehold.name;
  el.activeHouseholdId.textContent = state.activeHouseholdId;
}

async function copyActiveHouseholdId() {
  clearMessages();

  if (!state.activeHouseholdId) {
    showAppMessage('Nenhuma casa ativa para copiar.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(state.activeHouseholdId);
    showAppMessage('ID da casa copiado com sucesso.', 'success');
  } catch (error) {
    showAppMessage('Não foi possível copiar automaticamente. Copie o ID manualmente.', 'error');
  }
}

function renderScopeFilters() {
  if (!el.scopeFilters) return;

  const items = [
    {
      key: 'household',
      label: 'Casa',
      description: 'Você está vendo a casa inteira: individual de cada pessoa + compartilhado.',
    },
    ...state.householdUsers.map((user) => ({
      key: `member:${user.user_id}`,
      label: user.full_name,
      description: `Você está vendo apenas categorias e gastos de ${user.full_name}.`,
    })),
    {
      key: 'shared',
      label: 'Compartilhado',
      description: 'Você está vendo apenas o que pertence aos dois, como despesas em comum.',
    },
  ];

  el.scopeFilters.innerHTML = '';

  items.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `scope-tab ${state.selectedView === item.key ? 'active' : ''}`;
    button.textContent = item.label;
    button.addEventListener('click', () => {
      state.selectedView = item.key;
      renderOwnerScopeOptions();
      renderCategoryOptions();
      renderDashboard();
      renderScopeFilters();
    });
    el.scopeFilters.appendChild(button);
  });

  const active = items.find((item) => item.key === state.selectedView) || items[0];
  if (el.viewTabCaption) el.viewTabCaption.textContent = active.description;
}

function renderOwnerScopeOptions() {
  const options = buildOwnerScopeOptions();
  if (el.categoryOwnerScope) el.categoryOwnerScope.innerHTML = options;
  if (el.editCategoryOwnerScope) el.editCategoryOwnerScope.innerHTML = options;
  if (el.onboardingCategoryScope) el.onboardingCategoryScope.innerHTML = options;

  if (el.categoryOwnerScope && state.selectedView.startsWith('member:')) {
    el.categoryOwnerScope.value = state.selectedView.replace('member:', '');
  } else if (el.categoryOwnerScope && state.selectedView === 'shared') {
    el.categoryOwnerScope.value = 'shared';
  }

  if (el.onboardingCategoryScope && !el.onboardingCategoryScope.value) {
    el.onboardingCategoryScope.value = 'shared';
  }
}

function buildOwnerScopeOptions() {
  const options = ['<option value="shared">Compartilhado</option>'];
  state.householdUsers.forEach((user) => {
    options.push(`<option value="${user.user_id}">${escapeHtml(user.full_name)}</option>`);
  });
  return options.join('');
}

function renderCategoryOptions() {
  const visibleCategories = getVisibleCategoriesForSelection();
  const placeholder = state.isHydrating
    ? 'Carregando categorias...'
    : visibleCategories.length === 0
      ? 'Nenhuma categoria nesta visão'
      : 'Selecione';
  const options = [`<option value="">${escapeHtml(placeholder)}</option>`];
  const currentTxCategory = el.txCategory?.value || '';
  const currentEditTxCategory = el.editTxCategory?.value || '';

  visibleCategories.forEach((category) => {
    const scopeLabel = getScopeLabelFromCategory(category);
    options.push(`<option value="${category.id}">${escapeHtml(scopeLabel)} — ${escapeHtml(category.name)}</option>`);
  });

  if (el.txCategory) {
    el.txCategory.innerHTML = options.join('');
    if (visibleCategories.some((category) => category.id === currentTxCategory)) {
      el.txCategory.value = currentTxCategory;
    }
  }

  if (el.editTxCategory) {
    el.editTxCategory.innerHTML = options.join('');
    if (visibleCategories.some((category) => category.id === currentEditTxCategory)) {
      el.editTxCategory.value = currentEditTxCategory;
    }
  }
}

function getVisibleCategoriesForSelection() {
  if (state.selectedView === 'household') return state.categories;
  if (state.selectedView === 'shared') return state.categories.filter((item) => item.scope === 'shared');
  if (state.selectedView.startsWith('member:')) {
    const userId = state.selectedView.replace('member:', '');
    return state.categories.filter((item) => item.scope === 'personal' && item.owner_user_id === userId);
  }
  return state.categories;
}

function renderDashboard() {
  if (!el.totalBudget) return;

  const currentCurrency = getViewCurrency();
  const budgetRows = filterBudgetRowsByView(buildBudgetRows());
  const filteredTransactions = filterTransactionsByView(buildTransactionRows());

  const totalBudget = budgetRows
    .filter((row) => row.currency === currentCurrency)
    .reduce((sum, row) => sum + row.budget, 0);

  const totalSpent = filteredTransactions
    .filter((tx) => tx.currency === currentCurrency)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalRemaining = Math.max(totalBudget - totalSpent, 0);

  el.totalBudget.textContent = formatMoney(totalBudget, currentCurrency);
  el.totalSpent.textContent = formatMoney(totalSpent, currentCurrency);
  el.totalRemaining.textContent = formatMoney(totalRemaining, currentCurrency);
  el.totalCategories.textContent = String(budgetRows.length);

  const meta = getCurrentViewMeta();
  if (el.currentViewTitle) el.currentViewTitle.textContent = meta.title;
  if (el.currentViewSubtitle) el.currentViewSubtitle.textContent = meta.subtitle;

  renderDecisionLayer({ budgetRows, filteredTransactions, totalBudget, totalSpent, currentCurrency });
  renderBudgetsTable(budgetRows);
  renderTransactionsTable(filteredTransactions);
}

function renderDecisionLayer({ budgetRows, filteredTransactions, totalBudget, totalSpent, currentCurrency }) {
  const analysis = analyzeCurrentView({ budgetRows, filteredTransactions, totalBudget, totalSpent, currentCurrency });

  if (el.decisionStatusPill) {
    el.decisionStatusPill.textContent = analysis.status.label;
    el.decisionStatusPill.className = `status-pill ${analysis.status.tone}`;
  }
  if (el.decisionStatusTitle) el.decisionStatusTitle.textContent = analysis.status.title;
  if (el.decisionStatusSummary) el.decisionStatusSummary.textContent = analysis.status.summary;
  if (el.decisionMonthProgress) el.decisionMonthProgress.textContent = `Mês percorrido: ${analysis.monthProgress.toFixed(0)}%`;
  if (el.decisionSpendProgress) el.decisionSpendProgress.textContent = `Orçamento usado: ${analysis.budgetUsage.toFixed(0)}%`;

  if (el.decisionAlerts) {
    if (analysis.alerts.length === 0) {
      el.decisionAlerts.innerHTML = '<li class="decision-list-item muted">Nenhum alerta relevante neste recorte agora.</li>';
    } else {
      el.decisionAlerts.innerHTML = analysis.alerts.slice(0, 3).map((alert) => `<li class="decision-list-item">${escapeHtml(alert)}</li>`).join('');
    }
  }

  if (el.decisionActionTitle) el.decisionActionTitle.textContent = analysis.action.title;
  if (el.decisionActionBody) el.decisionActionBody.textContent = analysis.action.body;
}

function analyzeCurrentView({ budgetRows, filteredTransactions, totalBudget, totalSpent }) {
  const monthProgress = getMonthProgressPercent(state.selectedMonth);
  const budgetUsage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const criticalRows = budgetRows.filter((row) => row.percent >= 100);
  const attentionRows = budgetRows.filter((row) => row.percent >= 80 && row.percent < 100);
  const overspendDelta = budgetUsage - monthProgress;
  const missingBudgetCategories = filteredTransactions.filter((tx) => !budgetRows.some((row) => row.categoryId === tx.category_id));

  let status = {
    tone: 'healthy',
    label: 'Saudável',
    title: 'Orçamento sob controle',
    summary: 'O ritmo de gasto está compatível com o ponto do mês e não há categoria em risco imediato.',
  };

  if (criticalRows.length > 0 || overspendDelta > 20) {
    status = {
      tone: 'critical',
      label: 'Crítico',
      title: 'O mês pede correção imediata',
      summary: criticalRows.length > 0
        ? 'Há categoria estourada neste recorte. O ideal é ajustar gasto ou rever limite agora.'
        : 'O gasto acumulado está acima demais do ritmo esperado para este ponto do mês.',
    };
  } else if (attentionRows.length > 0 || overspendDelta > 10) {
    status = {
      tone: 'attention',
      label: 'Em atenção',
      title: 'Vale segurar o ritmo',
      summary: attentionRows.length > 0
        ? 'Existe categoria encostando no limite e isso já merece acompanhamento próximo.'
        : 'O recorte atual está gastando acima do ritmo esperado para este ponto do mês.',
    };
  } else if (totalBudget === 0 && filteredTransactions.length === 0) {
    status = {
      tone: 'attention',
      label: 'Começando',
      title: 'Estrutura ainda vazia',
      summary: 'Ainda não há orçamento e lançamentos suficientes para o SOMA gerar leitura útil do mês.',
    };
  }

  const alerts = [];
  criticalRows.slice(0, 2).forEach((row) => alerts.push(`${row.category} já passou do limite (${row.percent.toFixed(0)}% usado).`));
  attentionRows.slice(0, 2).forEach((row) => alerts.push(`${row.category} já consumiu ${row.percent.toFixed(0)}% do limite.`));
  if (overspendDelta > 10) alerts.push(`O gasto deste recorte está ${overspendDelta.toFixed(0)} pontos acima do ritmo esperado do mês.`);
  if (missingBudgetCategories.length > 0) alerts.push('Há lançamentos em categoria sem limite mensal definido.');

  const action = getPrimaryActionSuggestion({ budgetRows, filteredTransactions, criticalRows, attentionRows, overspendDelta });

  return { status, alerts, action, monthProgress, budgetUsage };
}

function getPrimaryActionSuggestion({ budgetRows, filteredTransactions, criticalRows, attentionRows, overspendDelta }) {
  if (!state.activeHouseholdId) {
    return {
      title: 'Crie a casa primeiro',
      body: 'Sem casa ativa o SOMA não consegue separar o que é individual e o que é compartilhado. Vá em Configurações e crie a estrutura principal.',
    };
  }

  if (budgetRows.length === 0) {
    return {
      title: 'Cadastre a primeira categoria',
      body: 'Sem categoria e limite mensal o SOMA não consegue avaliar pressão de orçamento. Comece pela despesa mais recorrente do mês.',
    };
  }

  if (filteredTransactions.length === 0) {
    return {
      title: 'Lance o primeiro gasto',
      body: 'Com a estrutura pronta, o próximo passo é registrar ao menos um lançamento neste recorte para ativar a leitura do mês.',
    };
  }

  if (criticalRows.length > 0) {
    return {
      title: 'Ataque a categoria estourada primeiro',
      body: `Revise a categoria ${criticalRows[0].category} e decida se o problema é excesso de gasto ou limite mal calibrado.`,
    };
  }

  if (attentionRows.length > 0 || overspendDelta > 10) {
    return {
      title: 'Segure o ritmo nas próximas compras',
      body: 'Evite novos gastos discricionários neste recorte até o uso voltar a ficar compatível com o momento do mês.',
    };
  }

  return {
    title: 'Mantenha o mês atualizado',
    body: 'Continue lançando os gastos em dia. A boa decisão vem mais da disciplina do registro do que de gráficos bonitos.',
  };
}

function getMonthProgressPercent(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const now = new Date();
  const selected = new Date(year, month - 1, 1);
  const current = new Date(now.getFullYear(), now.getMonth(), 1);

  if (selected < current) return 100;
  if (selected > current) return 0;

  const daysInMonth = new Date(year, month, 0).getDate();
  return Math.min(100, (now.getDate() / daysInMonth) * 100);
}

function buildBudgetRows() {
  return state.budgets.map((budget) => {
    const scopeKey = getScopeKey(budget.categories);
    const spent = state.transactions
      .filter((tx) => tx.category_id === budget.category_id)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const budgetAmount = Number(budget.amount);
    const remaining = Math.max(budgetAmount - spent, 0);
    const percent = budgetAmount === 0 ? 0 : (spent / budgetAmount) * 100;

    return {
      id: budget.id,
      categoryId: budget.category_id,
      category: budget.categories?.name || 'Sem categoria',
      scope: budget.categories?.scope || 'personal',
      scopeKey,
      scopeLabel: getScopeLabelFromCategory(budget.categories),
      currency: budget.currency,
      budget: budgetAmount,
      spent,
      remaining,
      percent,
      ownerUserId: budget.owner_user_id,
    };
  });
}

function buildTransactionRows() {
  return state.transactions.map((tx) => ({
    ...tx,
    scopeKey: getScopeKey(tx.categories),
    scopeLabel: getScopeLabelFromCategory(tx.categories),
  }));
}

function filterBudgetRowsByView(rows) {
  if (state.selectedView === 'household') return rows;
  if (state.selectedView === 'shared') return rows.filter((row) => row.scopeKey === 'shared');
  if (state.selectedView.startsWith('member:')) return rows.filter((row) => row.scopeKey === state.selectedView);
  return rows;
}

function filterTransactionsByView(rows) {
  if (state.selectedView === 'household') return rows;
  if (state.selectedView === 'shared') return rows.filter((row) => row.scopeKey === 'shared');
  if (state.selectedView.startsWith('member:')) return rows.filter((row) => row.scopeKey === state.selectedView);
  return rows;
}

function renderBudgetsTable(rows) {
  if (!el.budgetsTable) return;

  if (rows.length === 0) {
    el.budgetsTable.innerHTML = '<div class="empty-state">Nenhum limite mensal cadastrado para esta visão.</div>';
    return;
  }

  const showScope = state.selectedView === 'household';
  const html = [
    `<div class="table-shell"><table><thead><tr><th>Categoria</th>${showScope ? '<th>Escopo</th>' : ''}<th>Limite</th><th>Gasto</th><th>Saldo</th><th>Uso</th><th>Ações</th></tr></thead><tbody>`,
  ];

  rows.forEach((row) => {
    html.push(`
      <tr>
        <td>${escapeHtml(row.category)}</td>
        ${showScope ? `<td><span class="badge">${escapeHtml(row.scopeLabel)}</span></td>` : ''}
        <td>${formatMoney(row.budget, row.currency)}</td>
        <td>${formatMoney(row.spent, row.currency)}</td>
        <td class="${getMoneyClass(row.remaining, row.budget)}">${formatMoney(row.remaining, row.currency)}</td>
        <td>${buildUsageCell(row.percent)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-action-btn" type="button" aria-label="Editar categoria" title="Editar categoria" onclick="window.SOMA.editCategory('${row.categoryId}')">${getEditIcon()}</button>
            <button class="icon-action-btn danger" type="button" aria-label="Excluir categoria" title="Excluir categoria" onclick="window.SOMA.deleteCategory('${row.categoryId}')">${getTrashIcon()}</button>
          </div>
        </td>
      </tr>
    `);
  });

  html.push('</tbody></table></div>');
  el.budgetsTable.innerHTML = html.join('');
}

function renderTransactionsTable(rows) {
  if (!el.transactionsTable) return;

  if (rows.length === 0) {
    el.transactionsTable.innerHTML = '<div class="empty-state">Nenhum gasto lançado nesta visão do mês.</div>';
    return;
  }

  const showScope = state.selectedView === 'household';
  const html = [
    `<div class="table-shell"><table><thead><tr><th>Data</th><th>Categoria</th>${showScope ? '<th>Escopo</th>' : ''}<th>Descrição</th><th>Valor</th><th>Ações</th></tr></thead><tbody>`,
  ];

  rows.forEach((tx) => {
    html.push(`
      <tr>
        <td>${formatDate(tx.occurred_on)}</td>
        <td>${escapeHtml(tx.categories?.name || 'Sem categoria')}</td>
        ${showScope ? `<td><span class="badge">${escapeHtml(tx.scopeLabel)}</span></td>` : ''}
        <td>${escapeHtml(tx.description || '-')}</td>
        <td>${formatMoney(Number(tx.amount), tx.currency)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-action-btn" type="button" aria-label="Editar lançamento" title="Editar lançamento" onclick="window.SOMA.editTransaction('${tx.id}')">${getEditIcon()}</button>
            <button class="icon-action-btn danger" type="button" aria-label="Excluir lançamento" title="Excluir lançamento" onclick="window.SOMA.deleteTransaction('${tx.id}')">${getTrashIcon()}</button>
          </div>
        </td>
      </tr>
    `);
  });

  html.push('</tbody></table></div>');
  el.transactionsTable.innerHTML = html.join('');
}

function buildUsageCell(percent) {
  const safePercent = Math.max(0, percent || 0);
  const tone = safePercent >= 100 ? 'critical' : safePercent >= 80 ? 'attention' : 'healthy';
  const width = Math.min(safePercent, 100);
  return `
    <div class="usage-cell">
      <span class="usage-text">${safePercent.toFixed(1)}%</span>
      <div class="usage-bar"><span class="usage-fill ${tone === 'healthy' ? '' : tone}" style="width:${width}%"></span></div>
    </div>
  `;
}

function getEditIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>`;
}

function getTrashIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
}

function openEditCategory(categoryId) {
  clearMessages();
  const category = state.categories.find((item) => item.id === categoryId);
  const budget = state.budgets.find((item) => item.category_id === categoryId);

  if (!category) {
    showAppMessage('Não foi possível abrir essa categoria para edição.', 'error');
    return;
  }

  state.editingCategoryId = categoryId;
  state.editingBudgetId = budget?.id || null;

  if (el.categoryModalTitle) el.categoryModalTitle.textContent = `Editar categoria: ${category.name}`;
  if (el.editCategoryName) el.editCategoryName.value = category.name;
  if (el.editCategoryOwnerScope) {
    el.editCategoryOwnerScope.value = category.scope === 'shared' ? 'shared' : category.owner_user_id;
  }
  if (el.editCategoryCurrency) el.editCategoryCurrency.value = budget?.currency || getDefaultCurrencyForCategory(category);
  if (el.editBudgetAmount) el.editBudgetAmount.value = formatNumberForInput(budget?.amount || 0);

  openModal('categoryModal');
}

async function saveCategoryEdit() {
  clearMessages();

  const categoryId = state.editingCategoryId;
  const budgetId = state.editingBudgetId;
  const name = valueOf(el.editCategoryName);
  const ownerScope = el.editCategoryOwnerScope?.value;
  const currency = el.editCategoryCurrency?.value;
  const amount = parseCurrencyInput(valueOf(el.editBudgetAmount));
  const currentMonthFirstDay = `${state.selectedMonth}-01`;
  const currentBudget = state.budgets.find((item) => item.category_id === categoryId);

  if (!categoryId) {
    showAppMessage('Edição de categoria inválida.', 'error');
    return;
  }

  if (!name) {
    showAppMessage('Digite um nome válido para a categoria.', 'error');
    return;
  }

  if (Number.isNaN(amount) || amount < 0) {
    showAppMessage('Digite um limite mensal válido.', 'error');
    return;
  }

  const { scope, owner_user_id } = resolveScopeSelection(ownerScope);

  const { error: categoryError } = await supabase
    .from('categories')
    .update({ name, scope, owner_user_id })
    .eq('id', categoryId);

  if (categoryError) {
    showAppMessage(mapSupabaseError(categoryError), 'error');
    return;
  }

  const shouldUpdateExistingBudget = budgetId && currentBudget?.year_month === currentMonthFirstDay;

  const budgetPayload = {
    household_id: state.activeHouseholdId,
    category_id: categoryId,
    owner_user_id,
    year_month: currentMonthFirstDay,
    amount,
    currency,
  };

  const budgetRes = shouldUpdateExistingBudget
    ? await supabase
        .from('monthly_budgets')
        .update({ amount, currency, owner_user_id })
        .eq('id', budgetId)
    : await supabase
        .from('monthly_budgets')
        .insert([budgetPayload]);

  if (budgetRes.error) {
    showAppMessage(mapSupabaseError(budgetRes.error), 'error');
    return;
  }

  closeModal('categoryModal');
  await loadBudgetsAndTransactions();
  renderApp();
  showAppMessage('Categoria atualizada com sucesso.', 'success');
}

async function deleteCategory(categoryId) {
  clearMessages();

  const category = state.categories.find((item) => item.id === categoryId);
  if (!category) {
    showAppMessage('Categoria não encontrada.', 'error');
    return;
  }

  const { count, error: txCheckError } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  if (txCheckError) {
    showAppMessage(mapSupabaseError(txCheckError), 'error');
    return;
  }

  if ((count || 0) > 0) {
    showAppMessage('Essa categoria já possui lançamentos no histórico. Nesse caso, o caminho correto é editar, não excluir.', 'error');
    return;
  }

  const confirmed = window.confirm(`Excluir a categoria "${category.name}"? Isso também remove o limite mensal vinculado.`);
  if (!confirmed) return;

  const { error } = await supabase.from('categories').delete().eq('id', categoryId);

  if (error) {
    showAppMessage(mapSupabaseError(error), 'error');
    return;
  }

  await loadBudgetsAndTransactions();
  renderApp();
  showAppMessage('Categoria excluída com sucesso.', 'success');
}

function openEditTransaction(transactionId) {
  clearMessages();
  const tx = state.transactions.find((item) => item.id === transactionId);

  if (!tx) {
    showAppMessage('Não foi possível abrir esse lançamento.', 'error');
    return;
  }

  state.editingTransactionId = transactionId;

  if (el.transactionModalTitle) el.transactionModalTitle.textContent = 'Editar lançamento';
  if (el.editTxDate) el.editTxDate.value = tx.occurred_on;
  if (el.editTxCategory) el.editTxCategory.value = tx.category_id;
  if (el.editTxCurrency) el.editTxCurrency.value = tx.currency;
  if (el.editTxAmount) el.editTxAmount.value = formatNumberForInput(tx.amount);
  if (el.editTxDescription) el.editTxDescription.value = tx.description || '';

  openModal('transactionModal');
}

async function saveTransactionEdit() {
  clearMessages();

  const txId = state.editingTransactionId;
  const occurred_on = el.editTxDate?.value;
  const category_id = el.editTxCategory?.value;
  const currency = el.editTxCurrency?.value;
  const amount = parseCurrencyInput(valueOf(el.editTxAmount));
  const description = valueOf(el.editTxDescription);

  if (!txId || !occurred_on || !category_id || Number.isNaN(amount) || amount <= 0) {
    showAppMessage('Preencha data, categoria e valor válido.', 'error');
    return;
  }

  const { error } = await supabase
    .from('transactions')
    .update({ occurred_on, category_id, currency, amount, description })
    .eq('id', txId);

  if (error) {
    showAppMessage(mapSupabaseError(error), 'error');
    return;
  }

  closeModal('transactionModal');
  await loadBudgetsAndTransactions();
  renderDashboard();
  showAppMessage('Lançamento atualizado com sucesso.', 'success');
}

async function deleteTransaction(transactionId) {
  clearMessages();

  const tx = state.transactions.find((item) => item.id === transactionId);
  if (!tx) {
    showAppMessage('Lançamento não encontrado.', 'error');
    return;
  }

  const confirmed = window.confirm(`Excluir o lançamento de ${formatMoney(tx.amount, tx.currency)}?`);
  if (!confirmed) return;

  const { error } = await supabase.from('transactions').delete().eq('id', transactionId);

  if (error) {
    showAppMessage(mapSupabaseError(error), 'error');
    return;
  }

  await loadBudgetsAndTransactions();
  renderDashboard();
  showAppMessage('Lançamento excluído com sucesso.', 'success');
}

function openModal(id) {
  const node = byId(id);
  if (node) node.hidden = false;
}

function closeModal(id) {
  const node = byId(id);
  if (node) node.hidden = true;

  if (id === 'categoryModal') {
    state.editingCategoryId = null;
    state.editingBudgetId = null;
  }

  if (id === 'transactionModal') {
    state.editingTransactionId = null;
  }

  if (id === 'onboardingModal') {
    window.localStorage.setItem(getOnboardingStorageKey(), 'seen');
  }
}

function maybeAutoOpenOnboarding() {
  if (!el.onboardingModal || !state.user || state.onboardingAutoShown) return;
  const seenKey = getOnboardingStorageKey();
  if (window.localStorage.getItem(seenKey) === 'seen') return;
  if (state.households.length > 0) return;

  state.onboardingAutoShown = true;
  state.onboardingStep = 1;
  renderOnboardingStep();
  openModal('onboardingModal');
}

function startOnboarding() {
  state.onboardingStep = 1;
  renderOnboardingStep();
  if (!state.activeHouseholdId) {
    if (el.onboardingHouseholdName) el.onboardingHouseholdName.focus();
    return;
  }
  state.onboardingStep = 2;
  renderOnboardingStep();
  if (el.onboardingCategoryName) el.onboardingCategoryName.focus();
}

function getOnboardingStorageKey() {
  return `soma_onboarding_seen:${state.user?.id || 'anon'}`;
}

function setButtonLoading(button, isLoading, label = 'Carregando') {
  if (!button) return;
  const defaultLabel = button.dataset.defaultLabel || button.textContent.trim();
  button.dataset.defaultLabel = defaultLabel;
  button.disabled = isLoading;

  if (isLoading) {
    button.classList.add('is-loading');
    button.innerHTML = `<span class="btn-loader" aria-hidden="true"></span><span>${escapeHtml(label)}</span>`;
  } else {
    button.classList.remove('is-loading');
    button.textContent = defaultLabel;
  }
}

function showActionFeedback(message, type = 'info', panelId) {
  showAppMessage(message, type);

  const panel = panelId ? byId(panelId) : null;
  if (!panel) return;

  let box = panel.querySelector('[data-inline-feedback]');
  if (!box) {
    box = document.createElement('div');
    box.dataset.inlineFeedback = 'true';
    box.style.marginTop = '12px';
    const actions = panel.querySelector('.form-actions');
    if (actions) {
      actions.insertAdjacentElement('afterend', box);
    } else {
      panel.appendChild(box);
    }
  }

  box.innerHTML = `<div class="message ${type}">${escapeHtml(message)}</div>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearMessages() {
  if (el.authMessage) el.authMessage.innerHTML = '';
  if (el.appMessage) el.appMessage.innerHTML = '';
  document.querySelectorAll('[data-inline-feedback]').forEach((node) => {
    node.innerHTML = '';
  });
}

function showAuthMessage(message, type = 'info') {
  if (!el.authMessage) return;
  el.authMessage.innerHTML = `<div class="message ${type}">${escapeHtml(message)}</div>`;
}

function showAppMessage(message, type = 'info') {
  if (!el.appMessage) return;
  el.appMessage.innerHTML = `<div class="message ${type}">${escapeHtml(message)}</div>`;
}

function resetStateAfterLogout() {
  closeModal('categoryModal');
  closeModal('transactionModal');

  state.user = null;
  state.profile = null;
  state.households = [];
  state.householdUsers = [];
  state.activeHouseholdId = null;
  state.categories = [];
  state.budgets = [];
  state.transactions = [];
  state.selectedView = 'household';
  state.editingCategoryId = null;
  state.editingBudgetId = null;
  state.editingTransactionId = null;
  state.onboardingAutoShown = false;
  state.onboardingStep = 1;
  state.activeScreen = 'management';
}

function resolveScopeSelection(value) {
  if (!value || value === 'shared') {
    return { scope: 'shared', owner_user_id: null };
  }
  return { scope: 'personal', owner_user_id: value };
}

function getCurrentViewMeta() {
  if (state.selectedView === 'shared') {
    return {
      title: 'Visão do compartilhado',
      subtitle: 'Só despesas e orçamento que pertencem aos dois.',
    };
  }

  if (state.selectedView.startsWith('member:')) {
    const userId = state.selectedView.replace('member:', '');
    const member = state.householdUsers.find((item) => item.user_id === userId);
    return {
      title: member ? `Visão de ${member.full_name}` : 'Visão individual',
      subtitle: 'Só categorias e gastos dessa pessoa neste mês.',
    };
  }

  return {
    title: 'Visão da casa',
    subtitle: 'Panorama geral da casa neste mês, sem perder a origem dos gastos.',
  };
}

function getViewCurrency() {
  if (state.selectedView.startsWith('member:')) {
    const userId = state.selectedView.replace('member:', '');
    const member = state.householdUsers.find((item) => item.user_id === userId);
    return member?.default_currency || state.profile?.default_currency || 'BRL';
  }
  return state.profile?.default_currency || 'BRL';
}

function getDefaultCurrencyForCategory(category) {
  if (category?.scope === 'personal' && category?.owner_user_id) {
    const member = state.householdUsers.find((item) => item.user_id === category.owner_user_id);
    return member?.default_currency || state.profile?.default_currency || 'BRL';
  }
  return state.profile?.default_currency || 'BRL';
}

function getScopeKey(category) {
  if (!category || category.scope === 'shared' || !category.owner_user_id) return 'shared';
  return `member:${category.owner_user_id}`;
}

function getScopeLabelFromCategory(category) {
  if (!category || category.scope === 'shared' || !category.owner_user_id) return 'Compartilhado';
  const member = state.householdUsers.find((item) => item.user_id === category.owner_user_id);
  return member?.full_name || 'Pessoal';
}

function mapSupabaseError(error) {
  const message = error?.message || '';

  if (message.includes('duplicate key value violates unique constraint "household_members_pkey"')) {
    return 'Você já faz parte desta casa.';
  }

  if (message.includes('violates foreign key constraint "household_members_household_id_fkey"')) {
    return 'Essa casa não foi encontrada. Confira o ID e tente de novo.';
  }

  if (message.includes('duplicate key value violates unique constraint "idx_categories_unique_name"')) {
    return 'Já existe uma categoria com esse nome nessa mesma caixa financeira.';
  }

  if (message.includes('duplicate key value violates unique constraint "idx_monthly_budgets_unique"')) {
    return 'Essa categoria já tem limite cadastrado para esse mês.';
  }

  if (message.includes('violates foreign key constraint "transactions_category_id_fkey"')) {
    return 'A categoria escolhida não existe mais ou não está disponível.';
  }

  if (message.includes('invalid login credentials')) {
    return 'Email ou senha inválidos.';
  }

  if (message.includes('User already registered')) {
    return 'Esse email já está cadastrado.';
  }

  if (message.includes('new row violates row-level security policy')) {
    return 'Você não tem permissão para concluir essa ação nesta casa.';
  }

  return message || 'Ocorreu um erro inesperado.';
}

function isDuplicateKey(error) {
  return (error?.message || '').includes('duplicate key value violates unique constraint');
}

function getMoneyClass(remaining, budget) {
  if (budget === 0) return '';
  const percent = remaining / budget;
  if (percent <= 0.1) return 'money-danger';
  if (percent <= 0.25) return 'money-warning';
  return 'money-positive';
}

function formatMoney(value, currency) {
  return new Intl.NumberFormat(currency === 'EUR' ? 'pt-PT' : 'pt-BR', {
    style: 'currency',
    currency,
  }).format(Number(value || 0));
}

function formatDate(dateString) {
  const [y, m, d] = dateString.split('-');
  return `${d}/${m}/${y}`;
}

function formatNumberForInput(value) {
  return Number(value || 0).toFixed(2).replace('.', ',');
}

function syncTransactionDateWithSelectedMonth(force = false) {
  if (!el.txDate || !state.selectedMonth) return;

  const currentValue = el.txDate.value;
  if (!currentValue || force || !isDateInYearMonth(currentValue, state.selectedMonth)) {
    el.txDate.value = getSuggestedTransactionDate(state.selectedMonth);
  }
}

function getSuggestedTransactionDate(yearMonth) {
  const today = getToday();
  if (isDateInYearMonth(today, yearMonth)) return today;
  return getFirstDayOfMonth(yearMonth);
}

function isDateInYearMonth(dateString, yearMonth) {
  if (!dateString || !yearMonth) return false;
  return String(dateString).slice(0, 7) === yearMonth;
}

function getFirstDayOfMonth(yearMonth) {
  return `${yearMonth}-01`;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getLastDayOfMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const last = new Date(year, month, 0);
  const y = last.getFullYear();
  const m = String(last.getMonth() + 1).padStart(2, '0');
  const d = String(last.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseCurrencyInput(value) {
  if (!value) return NaN;
  const raw = String(value).trim().replace(/[^0-9,.-]/g, '');
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');

  let normalized = raw;

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = raw.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    normalized = raw.replace(',', '.');
  }

  return Number(normalized);
}


function withTimeout(promise, ms, message = 'A operação excedeu o tempo esperado.') {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(message));
    }, ms);

    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function byId(id) {
  return document.getElementById(id);
}

function bindClick(id, handler) {
  const node = byId(id);
  if (node) node.addEventListener('click', handler);
}

function valueOf(node) {
  return node?.value?.trim?.() || '';
}

window.SOMA = {
  editCategory: openEditCategory,
  deleteCategory,
  editTransaction: openEditTransaction,
  deleteTransaction,
};
