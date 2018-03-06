let skill = document.getElementsByClassName('skill');
console.log(skill);
for (let i = 0; i < skill.length; i++) {
  skill[i].addEventListener('mouseenter', (e) => {
    console.log(e);
    e.target.getElementsByTagName('span')[0].style += ";opacity: 1;";
  });
  skill[i].addEventListener('mouseleave', (e) => {
    console.log(e);
    e.target.getElementsByTagName('span')[0].style -= ";opacity: 1;";
  });
}
