const $ = id => document.getElementById(id);
const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

const FPL_2025 = {
    1: 15060, 2: 20440, 3: 25820, 4: 31200,
    5: 36580, 6: 41960, 7: 47340, 8: 52720
};

const ACA_CONTRIBUTION = [
    { maxFPL: 150, rate: 0.00 },
    { maxFPL: 200, rate: 0.02 },
    { maxFPL: 250, rate: 0.04 },
    { maxFPL: 300, rate: 0.06 },
    { maxFPL: 400, rate: 0.085 },
    { maxFPL: Infinity, rate: 0.085 }
];

const BASE_PREMIUMS = {
    '21-24': 320, '25-29': 340, '30-34': 380, '35-39': 420,
    '40-44': 470, '45-49': 540, '50-54': 620, '55-59': 720, '60-64': 850
};

const STATES = [
    'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
    'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
    'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
    'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
    'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
    'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
    'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
    'Wisconsin','Wyoming','District of Columbia'
];

const stateSelect = $('state');
STATES.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    if (s === 'California') opt.selected = true;
    stateSelect.appendChild(opt);
});

$('calc-btn').addEventListener('click', calculate);
$('income').addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });

function getAgeBracket(age) {
    if (age < 25) return '21-24';
    if (age < 30) return '25-29';
    if (age < 35) return '30-34';
    if (age < 40) return '35-39';
    if (age < 45) return '40-44';
    if (age < 50) return '45-49';
    if (age < 55) return '50-54';
    if (age < 60) return '55-59';
    return '60-64';
}

function calculate() {
    const income = parseFloat($('income').value) || 0;
    const householdSize = parseInt($('household-size').value);
    const age = parseInt($('age').value) || 35;
    const tobacco = $('tobacco').checked;

    if (income <= 0) return;

    const fpl = FPL_2025[householdSize] || FPL_2025[8];
    const fplPct = (income / fpl) * 100;

    // Expected contribution percentage
    let contributionRate = 0.085;
    for (const tier of ACA_CONTRIBUTION) {
        if (fplPct <= tier.maxFPL) {
            contributionRate = tier.rate;
            break;
        }
    }

    // Benchmark Silver premium (age-adjusted)
    const bracket = getAgeBracket(age);
    let benchmarkPremium = BASE_PREMIUMS[bracket] || 420;

    // Tobacco surcharge (up to 50% more)
    const tobaccoSurcharge = tobacco ? benchmarkPremium * 0.5 : 0;

    // Monthly expected contribution
    const annualContribution = income * contributionRate;
    const monthlyContribution = annualContribution / 12;

    // Premium Tax Credit (subsidy)
    let monthlySubsidy = 0;
    if (fplPct >= 100 && fplPct <= 400) {
        monthlySubsidy = Math.max(0, benchmarkPremium - monthlyContribution);
    } else if (fplPct > 400) {
        // Enhanced subsidies (extended through 2025): cap at 8.5% of income
        monthlySubsidy = Math.max(0, benchmarkPremium - monthlyContribution);
    }

    // Plan tier premiums (approximate ratios to Silver)
    const planRatios = { bronze: 0.75, silver: 1.0, gold: 1.25, platinum: 1.50 };
    const plans = {};
    for (const [tier, ratio] of Object.entries(planRatios)) {
        const fullPremium = benchmarkPremium * ratio + tobaccoSurcharge;
        const afterSubsidy = Math.max(0, fullPremium - monthlySubsidy);
        plans[tier] = { full: fullPremium, afterSubsidy };
    }

    // CSR info
    let csrInfo = '';
    if (fplPct <= 150) {
        csrInfo = 'You qualify for strong Cost-Sharing Reductions on Silver plans. Deductibles and copays will be significantly reduced (94% actuarial value).';
    } else if (fplPct <= 200) {
        csrInfo = 'You qualify for Cost-Sharing Reductions on Silver plans. Your deductibles and copays will be reduced (87% actuarial value).';
    } else if (fplPct <= 250) {
        csrInfo = 'You qualify for moderate Cost-Sharing Reductions on Silver plans (73% actuarial value).';
    } else {
        csrInfo = 'You do not qualify for Cost-Sharing Reductions at this income level. Consider comparing Bronze (lower premium) vs Gold (lower out-of-pocket costs).';
    }

    // Display results
    $('fpl-pct').textContent = fplPct.toFixed(0) + '% FPL';
    $('subsidy').textContent = fmt(monthlySubsidy) + '/mo';
    $('contribution').textContent = (contributionRate * 100).toFixed(1) + '% of income';

    const tierNames = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
    const tierClasses = { bronze: 'bronze', silver: 'silver', gold: 'gold', platinum: 'platinum' };
    const avValues = { bronze: '60%', silver: '70%', gold: '80%', platinum: '90%' };
    const deductibles = { bronze: '$7,500', silver: '$4,500', gold: '$1,500', platinum: '$500' };

    $('plan-grid').innerHTML = Object.entries(plans).map(([tier, p]) => `
        <div class="plan-card ${tierClasses[tier]}">
            <h3>${tierNames[tier]}</h3>
            <div class="detail">Actuarial Value: ${avValues[tier]}</div>
            <div class="premium">${fmt(p.afterSubsidy)}<span style="font-size:0.7rem;font-weight:400">/mo</span></div>
            <div class="detail">Full premium: ${fmt(p.full)}/mo</div>
            <div class="detail">Typical deductible: ${deductibles[tier]}</div>
        </div>
    `).join('');

    $('csr-info').textContent = csrInfo;

    $('d-income').textContent = fmt(income);
    $('d-fpl').textContent = fmt(fpl);
    $('d-fpl-pct').textContent = fplPct.toFixed(1) + '%';
    $('d-annual-contrib').textContent = fmt(annualContribution) + '/yr';
    $('d-benchmark').textContent = fmt(benchmarkPremium) + '/mo';
    $('d-ptc').textContent = fmt(monthlySubsidy);
    $('d-tobacco').textContent = tobacco ? fmt(tobaccoSurcharge) + '/mo' : 'None';

    $('results').style.display = 'block';
}

calculate();
