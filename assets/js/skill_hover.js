let skill = document.getElementsByClassName('skill');
for (let i = 0; i < skill.length; i++) {
  skill[i].addEventListener('mouseenter', (e) => {
    e.target.getElementsByTagName('span')[0].style += ";opacity: 1;";
  });
  skill[i].addEventListener('mouseleave', (e) => {
    e.target.getElementsByTagName('span')[0].style -= ";opacity: 1;";
  });
}

let projects = document.getElementsByClassName('project-screenshot-container');
for (let i = 0; i < skill.length; i++) {
  projects[i].addEventListener('mouseenter', (e) => {
    e.target.getElementsByClassName('screenshot-view')[0].style += ";display:inline";
    e.target.getElementsByClassName('screenshot-gradient')[0].style += ";background: rgba(0,0,0,0.8)";
  });
  projects[i].addEventListener('mouseleave', (e) => {
    e.target.getElementsByClassName('screenshot-view')[0].style -= ";display:inline";
    e.target.getElementsByClassName('screenshot-gradient')[0].style -= ";background: rgba(0,0,0,0.8)";
  });
}
