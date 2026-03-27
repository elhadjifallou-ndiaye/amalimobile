import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Noms féminins courants (sénégalais, ouest-africains, arabes, français)
const FEMALE_NAMES = new Set([
  'fatima','fatou','fatoumata','aminata','mariama','aissatou','rokhaya','ndéye','ndeye',
  'sokhna','mame','adja','binta','rama','awa','astou','seynabou','coumba','khady',
  'ndéye','penda','dieynaba','yacine','dior','nabou','bineta','maty','aby','fama',
  'oumou','hawa','marième','marieme','kadiatou','kadija','khadija','khadidja',
  'safiatou','safi','nafi','nafissatou','djenabou','maimouna','maïmouna','ramatoulaye',
  'ramatou','dienaba','soumaya','soukeyna','aida','aïda','nene','néné','tenin',
  'aminat','amina','halima','halimatou','salimata','sali','salima','faïda',
  // Noms français/européens féminins
  'marie','sophie','julie','sarah','sara','camille','emma','léa','lea','alice',
  'laura','lucie','claire','céline','celine','manon','pauline','marine','elise',
  'élise','anaïs','anais','caroline','charlotte','nathalie','isabelle','sandrine',
  'valérie','valerie','audrey','virginie','stéphanie','stephanie','jessica','jennifer',
  'amelia','amelie','amélie','inès','ines','yasmine','samira','sarah','karima',
  // Noms arabes/musulmans féminins
  'zainab','zaynab','mariam','maryam','hasna','hasnaa','imane','houda','hoda',
  'nadia','nawal','dounia','siham','zineb','rajae','soukaina','oumaima','chaimae',
  'widad','asmaa','asma','malak','rania','ranya','lina','layla','leila','laila',
  'nora','noura','nour','ghizlane','ghita','ihsan','ikram','iman','ilham',
]);

// Noms masculins courants
const MALE_NAMES = new Set([
  'moussa','ibrahima','mamadou','cheikh','modou','abdou','ousmane','lamine','babacar',
  'pape','serigne','malick','saliou','thierno','alpha','boubacar','bouba','alioune',
  'aliou','seydou','mor','birane','mbaye','ndiaye','diallo','diouf','ba','fall',
  'cissé','diop','seck','thiam','ndao','mbodj','faye','samb','gueye','kane',
  'omar','abdoulaye','abdoulaziz','aboubacar','amadou','idrissa','ismaila','ismael',
  'ismail','lansana','lansane','maodo','massamba','mbacké','mbacke','nfally',
  'papa','sadio','salif','souleymane','tidiane','touba','waly','youssouf','youssou',
  // Noms français/européens masculins
  'jean','pierre','paul','louis','marc','thomas','nicolas','julien','alexandre',
  'christophe','francois','François','david','michael','michaël','laurent','eric',
  'stéphane','stephane','olivier','vincent','antoine','sebastien','sébastien',
  'mathieu','romain','kevin','kévin','quentin','alexis','guillaume','baptiste',
  // Noms arabes/musulmans masculins
  'ahmed','muhammad','mohammed','mehmed','karim','youssef','hamza','amine','anas',
  'bilal','ibrahim','ismail','khalid','khaled','nabil','rachid','said','saïd',
  'tarik','tariq','walid','yassine','zakaria','ziad','hassan','hussein','hossein',
  'adam','ilyas','ilyes','ayman','aymen','sofiane','soufiane','samir','ramzi',
]);

function guessGender(name: string): 'homme' | 'femme' | '' {
  if (!name) return '';
  const first = name.trim().split(/\s+/)[0].toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // enlever accents

  if (FEMALE_NAMES.has(first)) return 'femme';
  if (MALE_NAMES.has(first)) return 'homme';

  // Heuristiques sur la terminaison du prénom
  if (/^.+(ou|awa|ata|nta|ama|ima|nia|iya|aya)$/.test(first)) return 'femme';
  if (/^.+(ane|ane|oul|oul|ane|oul)$/.test(first)) return 'homme';

  return '';
}

interface GenderModalProps {
  userId: string;
  userName?: string;
  onComplete: () => void;
}

export default function GenderModal({ userId, userName = '', onComplete }: GenderModalProps) {
  const [gender, setGender] = useState<string>(() => guessGender(userName));
  const [saving, setSaving] = useState(false);

  const guessed = guessGender(userName);

  const handleSave = async () => {
    if (!gender) return;
    setSaving(true);
    await supabase.from('profiles').update({ gender }).eq('id', userId);
    setSaving(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">👤</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Une dernière étape</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pour vous proposer des profils compatibles, confirmez votre genre.
          </p>
          {guessed && userName && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Suggestion basée sur votre prénom « {userName.trim().split(/\s+/)[0]} »
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setGender('homme')}
            className={`py-4 rounded-2xl border-2 font-semibold transition-all ${
              gender === 'homme'
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            Homme
          </button>
          <button
            onClick={() => setGender('femme')}
            className={`py-4 rounded-2xl border-2 font-semibold transition-all ${
              gender === 'femme'
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            Femme
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={!gender || saving}
          className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold disabled:opacity-40 transition-all"
        >
          {saving ? 'Enregistrement...' : 'Confirmer'}
        </button>
      </div>
    </div>
  );
}
