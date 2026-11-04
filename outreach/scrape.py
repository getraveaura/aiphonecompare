import json,re,subprocess,csv,concurrent.futures as cf
V=json.load(open('../src/data/vendors.json'))
cand={'dialzara':'dialzara.com','ruby':'ruby.com','arini':'arini.ai','weave':'getweave.com','peerlogic':'peerlogic.com','viva-ai':'vivaai.com','nexhealth':'nexhealth.com','mango-voice-margo':'mangovoice.com','voicestack':'voicestack.com','dental-intelligence':'dentalintel.com','lexidesk':'lexidesk.ai','abby-connect':'abby.com','rosie':'heyrosie.com','my-ai-front-desk':'myaifrontdesk.com','legalclerk-ai':'legalclerk.ai','hona-voice-ai':'hona.com','avoca':'avoca.ai','sameday-ai':'gosameday.com','oncrew':'oncrew.ai','pickupbell':'pickupbell.com','turnkey-dispatch':'turnkeydispatch.com','upfirst':'upfirst.ai','allo':'withallo.com','serviceagent':'serviceagent.ai','bland-ai':'bland.ai','jobber-ai-receptionist':'getjobber.com','housecall-pro-csr-ai':'housecallpro.com','servicetitan-ai-voice-agent':'servicetitan.com','agentzap':'agentzap.ai','elevenlabs-ai-receptionist':'elevenlabs.io'}
paths=['','/contact','/contact-us','/contact/','/about','/partners','/partner','/support','/privacy','/privacy-policy','/legal/privacy','/terms']
BAD=re.compile(r'(example|sentry|wixpress|\.png|\.jpg|\.webp|\.svg|domain\.com|email\.com|yourname|u003e|@2x)',re.I)
def get(u):
  r=subprocess.run(['curl','-sL','-m','12','-A','Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124','-w','\n%{http_code} %{url_effective}',u],capture_output=True,text=True,errors='ignore').stdout
  body,_,meta=r.rpartition('\n');return body,meta
def run(v):
  site=v.get('website') or ('https://'+cand[v['slug']] if v['slug'] in cand else '')
  if not site: return v,site,'','','',''
  dom=re.sub(r'^https?://(www\.)?','',site).split('/')[0]
  home,meta=get(site); name_ok=v['name'].split()[0].lower().replace('.ai','') in home.lower()
  found={}
  for p in paths:
    b,m=get(site.rstrip('/')+p) if p else (home,meta)
    if not m.startswith('200'): continue
    for e in set(re.findall(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}',b)):
      if BAD.search(e): continue
      found.setdefault(e.lower(),m.split(' ',1)[1])
  return v,site,dom,name_ok,meta.split(' ')[0],found
with cf.ThreadPoolExecutor(12) as ex: res=list(ex.map(run,V))
json.dump([[v['slug'],s,d,ok,code,f] for v,s,d,ok,code,f in res],open('raw.json','w'),indent=1)
for v,s,d,ok,code,f in res: print(v['slug'],s,code,ok,f)
