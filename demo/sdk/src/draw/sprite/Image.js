Ext.define("Ext.draw.sprite.Image", {
    extend: "Ext.draw.sprite.Rect",
    alias: 'sprite.image',
    type: 'image',
    statics: {
        imageLoaders: {},
        getWaitingImage: function () {
            var image = document.createElement('img');
            image.style.position = 'absolute';
            image.style.zIndex = 100000;
            image.style.top = '-1000px';
            Ext.getBody().dom.appendChild(image);
            // TODO: use a better image.
            image.src = "data:image\/gif;base64,R0lGODlhfQB9ANUAAP%2F%2F%2F%2Ff39+%2Fv7+bm5t7e3tbe3rXe787W3s7W1rXW77XW5rXW3sXO1r3O3r3O1rXO3" +
                "q3O3q3O5q3F3q3F1q3FzqXF1q29zq29xaW91qW9zpy9xbW1ta21xa21ta21vaW1xZy1vZy1xZyttZSttZSlpZSlrYylrZScpYycpYyUnIyUlISUn" +
                "IyMlIyMjISMlISMjHuMlISEhISEjHuEjHN7hHNze2tra2NjY7jf9gAAAAAAAAAAAAAAAAAAAAAAAAAAACH%2FC05FVFNDQVBFMi4wAwEAAAAh+QQJ" +
                "BwA4ACwHAAwAagBqAAAG%2F0CccEgsGo%2FIJFHBYDgMyqh0Sq1akwiAFhBwXL%2FgsHiY3W4b47R6LVSYzQK2fF5lvM0Kun5ftN+1aHyCdH5%2FgYOIaoV" +
                "3h4mOYItvjY+UVJFmk5WaSZdnm59KnYCgaQoNDXlpogCZYhEVFRGDBgRmBVBiq61fCS43vzczCXsGA3cDuJB%2Fo2kJNMDANMOEy8hhus3P0MAmeg" +
                "LLANZf2GLO29A1euBa4lbkYObn0HoB6+HJluC7UvHyvzZ6Dti7504fPG3+fq3Qo6CevXZS3lXpl9CGLIYO10EMZdAKRX82JAhqOHAjEon8EFYUO" +
                "YjkQ3xI3PwJ4FElSJaIXGqEeaTWHf8GE23KC0lJJziTRYq9ORA0ITCilYxWm+KgAIED+44IPQdVk9Q%2FXvaAcPoP56avbwrw8eW0Kyi0WwjwmdHW" +
                "LCm4AJjuWbGSlBG4WcdUuOn3yFe1gthCc1t4ybctCBKhQGe3cREmqB5F0DCisuXPoEOLHk26tOnTqFOrXs26tevXsGOXukC7tu3bth+clmCit+%2F" +
                "fwH2PuDjEw4bjyJMrX95hWugEdMkmRFF8ufXrxzuM3iodGnUF2MMvtxB6bHeyES6IX589tOLz%2FkaoZy9eO+jo8P2ZsEBfvIfQfOXnDwgJdNAfdh" +
                "OENpiAXAnB34HL%2FSdagAwCA8IQFBgI4QYdXFD%2Fmgk2VFiDBkY8MMGJKKaoIoqpweLiizC+6JlsNNZo44045qjjjjz26OOPQAYppI0hnJDCCRVsU" +
                "sEKM8BwIWgJqBDDlFOeUMl7N0hjWZRUdlnCI5Odo6VfXHbZJXGCRJDQmJ+UaSaVGSSigVNsVuLmm1M+OcgIZNXpyJ14xgBBIhJI5+cggOLJwiM1" +
                "GOocolIGSuULgzoiQYh9PrpHom9SWsmljgrCqZmeWgECDDOskCQYoGa6aaSSxlAqFR8txCqmdGqqxqhdzkoFftB0c2uobPA6aaVVFDqUGK3mysY" +
                "JsU7pKxUmJLTqsGS5sEYE0cqKrBXV+nMttk6hGUYF0U5bmkW48oxLrrhqoCupuutaq0az7arBbaD01gvvvbieY24YKeDZr7%2F5roEvMDMUC6u034" +
                "bB7jnujrEwDXMkIAILspIwMBgTb1PxGBGsEGINwqIWMjQjDznEysC07DIOMP8is8s133DzkDnvLGTPMyMBdNBGDE00EUYfLUTSSvPpz4wzqylPO" +
                "koXEeY2JFZt9WJ6ak1EBCOY0LVlQQAAIfkECQcAOAAsBwAMAGoAagAABv9AnHBILBqPyCRRwWA4DMqodEqtWpMIgBYQcFy%2F4LB4mN1uG+O0ei1U" +
                "mM0CtnxeZbzNCrp+X7TftWh8gnR+f4GDiGqFd4eJjmCLb42PlFSRZpOVmkmXZ5ufSp2AoGkKExN5aaIAmWIKDQ2pfAkdG7YbHQljq61fBgVmBFB" +
                "6tLe3uWK8agYDdwPDcxfGxsiQf6NjzNcMerXTx7pfymLa13F039PVVuNg5dcA3enU4XXwvVLv1wF6HvP07O65awZPywE9Crz9w1VPSrsq+vbJmv" +
                "NA4b91UR5OifgnwEQ6FRfawshJIESCBT0iCimS5BE3Ha1wvKMyEcuFLo0Q+MONysz%2FNzUd3bzY8EjEgz5Rwgv6aOi8DlMcFCBwAN8RpRI%2FOU1ng" +
                "Y+DglqYatqqjg+wlB83kT3GZ+fStFotTvPA58BbUkbWTuDTICvevHJxDTprRuzfIUPpIiqjRQDcw4gvUHiMsAEDypAza97MubPnz6BDix5NurTp" +
                "06hTq14dJgIIEbBjy54dG0JoCSZy697NW%2FeICEVKxBhOvLjx4ymKQk4w44bz59CjS0cxRPjx69hjqOhMQ7r3786pR8hO%2FviHzSDAq5fuurz74Sc" +
                "2u1hP3%2FkIEe%2Fdp9jcvP56Ex%2FkVx4Jm63g33ogJPCCgNlVsFkFB4JngxABMngcgZwZGKF0IAyR%2FwELFg73ggifmWDDhs7VoIEREFTg4oswxvjiaD" +
                "LWGKMErOWo44489ujjj0AGKeSQRBZp5JFCggDDDCs4qEkFK8wAQ4eaJdAddC5UMh90NCj3iZXeUecICt51+ReY3wGHSATgmQkKmt+tiIgG6rmpC" +
                "ZzfjZDICOvZ+Qie3+GIiAT0+YkIoN7V8EgNhXpJzJXq2SBoIhKc2KejciAqnaSVVNqoIJpGx6kVSjLp5BeeXrpHqNCNSgWgK4SRap2YhsHqc65S" +
                "0V90JshqKa2ZQirhpFQQ6t2Evn66xpaREkuFCeCdiuqv4GWpBpvr5VoFtN9JOy19ao4BYbNhcOudt9+qh5DuF+N+p60V5kq37hWznnvtsGPEG92" +
                "89FIbXbhj7Nqqs1%2FoCx2%2F%2FXo3gxzC3vBuwdHKUe8NNNBhAqM2rACwGAY%2Fh%2FAXEaxwYg29jtaxcx8fefINKRu5cstFvoykEjLPjETNNhuBc85E7M" +
                "yzED7%2FHDTPfAb6cxHYSqfo0UWQKZ2cTBPhtHM2UBk10iOYYHVmQQAAIfkEBQcAOAAsBwAMAGoAagAABv9AnHBILBqPyCRRcblYEsqodEqtWpOej" +
                "XbTsVy%2F4LB4mN1uKeO0ei1UmM0dtnxevbzND7p+X7TftRN8gnp+f4GDiGuFd4eJjmGLb42PlHV%2FgJWZVJFmk5qfRpxbnqBfERUVEWqimGwKDQ0K" +
                "gwkpMbYxJ1BirBukYAYFAMIABAZ7CSq3tyq6YLy+VwYDw8MDxnQiysrMkJe9adLU1Ax6LNrbzVbPY+HiwwJ659rcV+th7e7Dei%2Fy6PXe0KTgywc" +
                "ggB4S%2FfxZuhRQyUCCB%2FRE4JfQFr0p9qw8zBdAlh4IFCtejJKRykZ3HQWBrGgxXZKSAqcRHJZy0EqWI5E8uBSnykn%2FcTUR3RTp8kiHPxd8ypxZ0K" +
                "OjoQlzGklw1IwHpUyFBX0EtZ+KKRY6dPDQ0MjSmVspdZX3gY+DrE1LrdV2gk8wpmk1zb2Vgg8BvE5L4dgbgwSfA2gDCx4cUlsFPg0I5l28tq6gu" +
                "9QmLx5s7laJRAioCVC8uQgEEBlUOXrFgHTp17Bjy55Nu7bt27hz697Nu7fv38CDp4kwwoTx48iTH5dwWwGD59CjS4+uGMWN69iza98+o+hmA3%2Fh" +
                "EkQwxPr28+hv0Jh9Vrw78hHSy98OIvZb90wVjJjP%2F7qL2Jjhlw8DJvTH3wyxhSfggCAYON8KsSG2YD4O4GCDg+k9BltkEwJl%2F0yDGG4HoWwSdih" +
                "MhUJoUEOI19lgQm0MBNChAA0YIQEqOOaoY465weLjj0D+6JpwRBZp5JFIJqnkkkw26eSTUEYppZEgwDDDChpWUsEKM8BQH2wJ0KDdf5S4oB0N3m" +
                "kS5nkoPGLemWlSsiZ6qg0SH3poljInehokooF8eaoppnwjJLIfoHHysWd6zCEiAX+BOrIoejU8suJ8kc4yqHw2NJqIBBdimugak57XaSWgQjrqG" +
                "KVud6oVVV6Z5RWpinrMpum9SsWkI35RK6J0tKqdrlTMcN6LYPyaXqZpCJsdsVM8aqoYyuK5KhVmzgftFAWiNyutocpH5nD8bctthmNUe5tenWJU" +
                "oK2nV3R73re+huutGu7mCm+86Kahbnb0mqLvGPJuF3C96bErhrGu7vtFwdodjDB3cuB6g7n83stGtevNYcKKNqygcBgQAzxHBCtcWAOyuJWMncR" +
                "T4uDydTBPOfMNNUt5c85R7hxzEj7%2FfETQQhdBdNFDHI20zP0uLcSh5zlc9J3bVeo0EW9m1+fVWD%2F7JddEEGfC168FAQAh+QQJBwA4ACwHAAwAag" +
                "BqAAAG%2F0CccEgsGo%2FIJDECEoWU0Kh0Sq0qS7Fs7PW0er%2FgsBCr1WbE6LRaGCmXWeu4nApyl+f4vFFk1+r%2FeXx9MYCFcYJ9hopoiHaLj1+NbpCUV" +
                "JJ3lZlKl36annuDhHITE4YzN6g3LoyhcR0bsBsdfzSpqTRinFlrr7Gws3gmtra4YLqiaL2+sBd4NcPExq3Jy77ActDDxVbH1NW+eDbZ0dzTYMrf" +
                "sngr4+SW5l7o6R554u2o21LdX%2FLf13MS7N3LB2WflX7VOjz4E%2FAevikGqSBcprBQQ4cEkwx6cTCdtYWGLg6UkqKPiCoTPz4S2S7jERVuSKD0GKs" +
                "iJJbjXBr5cCKFzP+ZNGWBpIQzGwg9FoIK9VR02Ko8KX8N1dQ01Qw9UW1+wlH1xgo9Hjxq3cpV4LA%2FE9KNJVsW2lOsCaeyFSLhWSoUhsLWlDt3iI" +
                "QRGiBRuMC3r+HDiBMrXsy4sePHkCNLnky5suXLmDNr3sy5s+fPoEOLHk26tOnTqFOrXs26tevXsGPLnk27dpwGBwgUcGC7AIDfvwfQRgC8uPDYC" +
                "oorP%2F66gfLlsBk8h+46+XTjrwVcx95aQYDtwJmv9g4+ePXv5cWrJp%2F+fHkA6lOzBx8f9fztBdyXV6B%2Fe4PX9z33H4DoTccfbAH+RsBsAdZX3QHf" +
                "CcCAbRRWaOGFGGao4YYcdugG4YcghhgEACH5BAUHADgALAcADABqAGoAAAb%2FQJxwSCwaj8gkMTIygRLKqHRKrVqTqJv2ZgNdv+CweJjdbjXjtHo" +
                "tjJjNNbZ8Xh29zRK6fl803bcVfIJ6fn83gYOJa4V%2FiIqPYYx3jpCVVZJvlJabSphmmpyhfYaHomkRFRURap6AcqiqgwkzZi5QYq1aoGAJJzG%2FMS" +
                "m3dAk0dzTDX7mlaQkqwMAqyWy5yJGku1bO0NAiejWk1srYY9vcwCx6pFriVsvZU+bnwHo26zftVO9h8vMxL3pW3MM3Lcq+L%2F38kdATwd69fAbJX" +
                "Uk478UqPRIcroOY5GAViudeQBCUcSDHIx7jPfMHTGSikg8LGpFgyIa2lSz%2FjVQEc6PM%2FyK07pj4iJOlS0g9w%2F0kYszMCqI5fx2tlNQQjSkgXMxY" +
                "Ae9IUX9TLVX942XPh6g6TY1944KPr5xhQ63dMoNPCrg7TQmZe+PpHhJG8+rdqzETnwpgBQ8mfKetoLfQ4i7eC24LCkUloLFQPJmIhBEaLiqKkAE" +
                "E586oU6tezbq169ewY8ueTbu27du4c+sewsSE79%2FAg%2F%2FO4%2FrBhePIkytPrqBImYF%2FZiw1laDDhuvYs2vf7oEM9I2rrW8fT35Ddzff15XtbKG8++" +
                "0K7KQn5biz+Pf4LyybXxf1ffzuXQDCfKT41ZkHAOJnAQ6FEegKahMk6F4HUAzooFOrISjheAsKof9BZQTaMBRrF%2FwnYQcUzJTKiiy2yGJsE8Qo4" +
                "4w0yvjAbjjmqOOOPPbo449ABinkkEQWaSRtIMCwVVd8NHAAAQU4kFoxbFlSAABYYjmAAZNRecdljyCQ5ZhbDublH6IJosCYbJYpypl%2FoJFIA2y2" +
                "ySUncP4xgiIM1GnnJnn+Qdwga%2FpJ5p2PBHpHHI8IYOihiTa1jg2DJqJAAI9m6aYgir5BqSWXZqolonp0asanVjhQAAEHNBBGqKJuOoepW6BKhQE" +
                "DsHnAq5jGSuoatGphKxUE+MkAr6ICIGszkpIy7BSF1hmAGLBmuqwYLgz07BR9GuoqsqIWsAZ6k1ZaRbd+fgudbqbNpVHBPdtSgW6d6q7rrRrvOm" +
                "uuFfOyWa+99KpB7h3xnvvovwCP2W4aQXm67xX9jolwwgAQIEezXDwM8cFyVDvqHCaAY8MKaYoRcZYTU3sApgIw8CtrJ2OZ8pE4xAzAzEfajLORO" +
                "tOMRM8+GwF00EQMTbQQRh+dNNFLB23zwkfjEC2bAkRdhJgBW00E1lgGIKXWRSjAAAMOvKxXEAAh+QQJBwA4ACwHAAwAagBqAAAG%2F0CccEgsGo%2FI" +
                "pHLJbDqf0Kh0Sq1ar9isdsvter%2FgsHhMLpvP6LR6zW673%2FC4fE6ve123%2FG1mb9P0ejR9an+AeiaDZ4WGeTWJZYuMeY9jkZI2lGGWkiuZX5uMmJ5" +
                "doIY2EqNcpYCnqVureq2uWbB5srNXtTe3uFW6vL1TIJKmqMFWeMS2xsdVM8q7zM1UK8rA01PE19hSyazS3FUogDXg4VYaI+bn7O3u7%2FDx8vP09f" +
                "b3+PlrIvz9%2Fv%2F9QESglyKGwYMIEyosIU+FwocQDTJ89yGiRYUD3Z24yNEgiHcFO14U8Y6EyIsf4J2M+CKeyZUKU8YT8QKmQRYZ9OncybOnz%2FafQ" +
                "IMKHUq0qNFBDgoQONBAzQQPHTpYqDMAgFWrBdB02MCVa4c5Va9eRWDGQ9ezX+GEFXtVQZmzcNO2WcvWatMxFODGnVuXLQMyF%2FTuVUO3LwC3Yx4I" +
                "HnymcF8BZrYu7iqXjOO6ARCTeSB58obKYS6zzYyGs2evY0SLJZ3G9GnQXFRfZa3GtWfYWWRbpb3G9mTcVnQD4M3G92LgUwoYXq35jXHByKEoWD6" +
                "7OZznerM0oD7cehzsZydg2b6c+BzwXMVfmW7YPB30Wgj0dV8He%2FQohenbMX5fCgMBwx3gHSVQfXbBUQgmqOCCDDbo4IMQRijhhBQ+EgQAIfkECQ" +
                "cAOAAsBwAMAGoAagAABv9AnHBILBqPyCQxMjKBEsqodEqtWpOom%2FZmA12%2F4LB4mN1uNeO0ei2MmM01tnxeHb3NErp+XzTdtxV8gnp+fzeBg4lrh" +
                "X+Iio9hjHeOkJVVkm+UlptKmGaanKF9hoeiaREVFRFqnoByqKqDCTNmLlBirVqgYAkuZjO3dAk0dzTBX7mlacPFx2y5xpGku1bMfyZ6NaTRyNNj" +
                "1n9xdKRa3FbJ1FPghno25DfmVOhh6382eivv8M5R81%2F1f1boieDuXbx+3q4AvGNjlR4JBckdTOKvysI3NvLwgahv4pGK6oi9y5iIo0F+RiQYumd" +
                "RJDmSikxKRFmE1h1sVC6agflI5jb%2FmkRcahGYU+hKjZV8GqIxBYSLGSvSHTFqD6klpX+87AGhjycnrG9c8PH10moosFtm8LF51BQRtDeI4iPl1S" +
                "0OtFLHVGhrtwhWsYLI7jTbV4gEbVtQKCqjpQbhwkMkjNDgUFEEDSMeQ97MubPnz6BDix5NurTp06hTq17NurUQBQxiy55Ne7YC0RJM6N7Nu%2FfuE" +
                "ZWFIABAvLjx48gJGPA8Sx8pxcKRS59OfIBnqs7NKFZAvTtyB5y5ZicXgYH388QLcBY8%2Fs8I8+i9E+DMtv1NB%2FG9H+Ccz35WAwHkR10DnO3lH0ZC" +
                "4Ccgcvt11t+BWmiFQwMCLEhcAAyAZkJE7dWA%2F0YRCjQg4ogkljgiaamkqOKKKmrm2oswxijjjDTWaOONOOao44489viZAwUQcACBm1RwQgonhMC" +
                "ZAQMcp14lJ8QgpZQqAGUJk9IhAEkJU3ZZpV1YTndbIhF0aeaXooQ5HZGDZGDmmVYKouZ0GSYCwptwbjKnmIpAgGeekOwpnQCQtPCnl3GyIShyAY" +
                "zZ56GIJrLocY1a4iekVCYqxqTGVWqFBR104MEEYVyKKZp0cFqcpzl1sMGrr3pQKqaZptqkd6xS4SqssF4wK62oqqHqhY5S8QCvvHYghqmQBjtGA" +
                "eflSsUFyPJK6q+YnrAGd7gWWwW11b56LbaQBhdGA92GAZ1uuOOS+2deU6BLnbRWrFttu+6+Ca8U3EpHb73hirsGs2+aGwYB%2Fnr7hb3I4rvsnyko" +
                "euuqCi8c8AYOPwzoGgYwUGEAB1RsccAZixFBlDG0IIKmdjFsrY9JuAxryTDLLDDMR9iMMc45X0yzjzr%2F3GPQPBtBdNFEHI20EEovrfMDSw+hQMD" +
                "KRj2EB+FSYDURWMPagQVbg3jBBRawDEkQACH5BAkHADgALAcADABqAGoAAAb%2FQJxwSCwaj8gkMTIygRLKqHRKrVqTqJv2ZgNdv+CweJjdbjXjtH" +
                "otjJjNNbZ8Xh29zRK6fl803bcVfIJ6fn83gYOJa4V%2FiIqPYYx3jpCVVZJvlJabSphmmpyhfYaHomkKDQ0Kap6AchEVFRGDBgQAtwAFBmOtWqBgC" +
                "S5mM1B6BgO4uAO7kaS%2FVwk0dzTFcwzJycvNhs9V0YYmegLY2cxXvaVi34ZxdOTY2ufO6tKkN3oB7+Xy3GHrpDb0HNC379K8L%2F9IrdCjIB%2FBW%2FGm" +
                "oOuWJKEhG7MYOnwYMcpEaPXs2cjDp+FDiOY6HaRi8c%2FIRCZPdkQi4aKVlndeKorJMSWS%2Fxl%2FwrEMCZDkI54EZx4hemPhUHtadFZCqm%2FAFBAuZqy" +
                "gaISpS6OWqL5zwAcEVC5gN4nFVoCPMJFpOa3FRYAP0KKmiMwFcIDPCrx59W7E1oBPhYtxA4ttK+itGamBiygYhwuBojJaaiSOPEQBA1WQImgYsZ" +
                "mz6dOoU6tezbq169ewY8ueTbu27du4xXhmwLu379+9V7WWYKK48ePIjY%2FIOATByYcEfHJOcPfsHxTNn8tU7dW6GewKtD8ne9qsd3sRrol%2FyNi04" +
                "%2FN%2FRqhfr6%2Fu6erw75hwQJ9g39N%2F5fcHCAYM1h8uhZ12mIBvBIQDfwcm8x9qATKohRdCNEBZfwEwwP+aCTYwWAMakqVi4okonghbLCy26GKLpeUm" +
                "44w01mjjjTjmqOOOPPbo449AymhBBx14MAEnFawwAwwYmpZABxtEGWUHlrx3AzXTQSmllB5AgpkZWOb15JZkCjeIG4aEGcqYZG5JgSIa2KOmJWy" +
                "2KeUFitghZzWQ1GlnlA8oUhNUcybi559UPlLDWYXycaidHQT6iAQhEsrnHo+2GakllDJ66RyZkrmpFSGckMIJXCXRqaWYavnnlJKypEIMtNJKQh" +
                "ir7klHqFuOWkUKtQYrAq6V6soGr1L6SgUEwQb7ghi5ktJoGK6+qiwVIjQbbKqqFkuKC2so8GqysVqRrba0ctug7VnMiTHBuBtcW8W56Kq7rj32J" +
                "vGuteVeQa+2+dLk7SRqiItov%2F6im+4a0b7RrhjVkpvGv80GfO8bMxwbsbxfULytHA3TAOoFUBZp5hge12qxEhGsEGINQr2W8sJBJjFzDCvjeHPO" +
                "N+5cs80K4%2FwzEj4PbUTRRhOBdNJCLM2000mDEDQETC+hMAtVF1ECuhlkrbWzH3htRAQgiPDBp3kFAQA7";
            this.waitingImage = image;
            Ext.draw.sprite.Image.getWaitingImage = function () { return Ext.draw.sprite.Image.waitingImage; };
            return this.waitingImage;
        }
    },

    inheritableStatics: {
        def: {
            processors: {
                src: 'string'
            },
            defaults: {
                src: '',
                width: null,
                height: null
            }
        }
    },

    render: function (surface, ctx) {
        var me = this,
            attr = me.attr,
            mat = attr.matrix,
            src = attr.src,
            x = attr.x,
            y = attr.y,
            width = attr.width,
            height = attr.height,
            loadingStub = Ext.draw.sprite.Image.imageLoaders[src],
            imageLoader;

        if (loadingStub && loadingStub.done) {
            mat.toContext(ctx);
            ctx.drawImage(loadingStub.image, x, y, width || loadingStub.width, height || loadingStub.width);
            return;
        } else if (!loadingStub) {
            imageLoader = new Image();
            loadingStub = Ext.draw.sprite.Image.imageLoaders[src] = {
                image: imageLoader,
                done: false,
                pendingSprites: [me],
                pendingSurfaces: [surface]
            };
            imageLoader.width = width;
            imageLoader.height = height;
            imageLoader.onload = function () {
                var i;
                if (!loadingStub.done) {
                    loadingStub.done = true;
                    for (i = 0; i < loadingStub.pendingSprites.length; i++) {
                        loadingStub.pendingSprites[i].setDirty(true);
                    }
                    for (i in loadingStub.pendingSurfaces) {
                        loadingStub.pendingSurfaces[i].renderFrame();
                    }
                }
            };
            imageLoader.src = src;
        } else {
            Ext.Array.include(loadingStub.pendingSprites, me);
            Ext.Array.include(loadingStub.pendingSurfaces, surface);
        }

        // Draw loading mark
        mat = mat.clone();
        var list = mat.transformList([
            [x, y],
            [x + width, y],
            [x + width, y + height],
            [x, y + height]
        ]);
        try {
            // Sometimes this will generate an error
            ctx.drawImage(Ext.draw.sprite.Image.getWaitingImage(), (list[0][0] + list[2][0]) * 0.5 - 16, (list[0][1] + list[2][1]) * 0.5 - 16, 32, 32);
        } catch (e) {

        }

    }
});